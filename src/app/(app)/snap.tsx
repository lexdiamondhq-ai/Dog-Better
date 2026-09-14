import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { pickFromLibrary, uploadImage } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * A full-bleed camera with the controls floating on glass. After the shutter, the
 * photo stays on screen and the form slides up over it, so you never lose the moment.
 */
export default function Snap() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { dog } = useDogs();
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef<CameraView>(null);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [uri, setUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shoot = async () => {
    const photo = await cam.current?.takePictureAsync({ quality: 0.85 });
    if (photo?.uri) setUri(photo.uri);
  };

  const save = async () => {
    if (!user || !dog || !uri) return;
    setBusy(true);
    setError(null);
    try {
      const storage_path = await uploadImage({ bucket: 'vault', userId: user.id, folder: `dogs/${dog.id}`, uri });
      const { error: err } = await supabase.from('dog_photos').insert({ dog_id: dog.id, owner_id: user.id, storage_path, caption: caption.trim() || null });
      if (err) throw err;
      if (share) {
        const image_path = await uploadImage({ bucket: 'media', userId: user.id, folder: 'posts', uri });
        await supabase.from('posts').insert({ author_id: user.id, dog_id: dog.id, caption: caption.trim() || null, image_path });
      }
      router.back();
    } catch (e) {
      setError(humanizeError(e, 'Could not save this photo.'));
    } finally {
      setBusy(false);
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {permission.granted || uri ? <StatusBar style="light" /> : null}
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : permission.granted ? (
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.bg, padding: space.xl, gap: space.md }]}>
          <Icon name="camera" size={40} color={t.brand} />
          <Text variant="title" align="center">
            Camera access
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Dog Better needs the camera to take vault photos. Nothing is uploaded until you tap save.
          </Text>
          <Button label="Allow camera" onPress={requestPermission} />
          <Button label="Choose from library instead" kind="ghost" onPress={async () => setUri(await pickFromLibrary([4, 5]))} />
        </View>
      )}

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <Tap onPress={() => (uri ? setUri(null) : router.back())} haptic="selection" accessibilityLabel={uri ? 'Retake' : 'Close'}>
          <Glass borderRadius={22} style={styles.glassBtn}>
            <Icon name={uri ? 'back' : 'close'} size={18} />
          </Glass>
        </Tap>
        <Glass borderRadius={radius.pill} style={styles.pill}>
          <Icon name="paw" size={14} color={t.brand} />
          <Text variant="label">{dog?.name ?? 'Vault'}</Text>
        </Glass>
        {!uri && permission.granted ? (
          <Tap onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} haptic="selection" accessibilityLabel="Flip camera">
            <Glass borderRadius={22} style={styles.glassBtn}>
              <Icon name="refresh" size={18} />
            </Glass>
          </Tap>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {!uri && permission.granted ? (
        // Plain View on purpose: a Glass that mounts inside a fading ancestor never attaches its effect.
        <View style={[styles.shutterRow, { paddingBottom: insets.bottom + space.xl }]}>
          <Tap onPress={async () => setUri(await pickFromLibrary([4, 5]))} haptic="selection" accessibilityLabel="Library">
            <Glass borderRadius={22} style={styles.glassBtn}>
              <Icon name="photo" size={18} />
            </Glass>
          </Tap>
          <Tap onPress={shoot} haptic="heavy" scaleTo={0.9} accessibilityLabel="Take photo">
            <View style={styles.shutterOuter}>
              <View style={[styles.shutterInner, { backgroundColor: t.accent }]} />
            </View>
          </Tap>
          <View style={{ width: 44 }} />
        </View>
      ) : null}

      {uri ? (
        <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Surface kind="raised" radiusSize="xl" style={{ gap: space.lg }}>
            <Field placeholder={`A note about this moment (optional)`} value={caption} onChangeText={setCaption} maxLength={200} error={error ?? undefined} />
            <View style={styles.shareRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">Also share with the pack</Text>
                <Text variant="caption" tone="tertiary">
                  Off by default. The vault copy stays private either way.
                </Text>
              </View>
              <Switch value={share} onValueChange={setShare} trackColor={{ true: t.brand }} />
            </View>
            <Button label={share ? 'Save and share' : 'Save to vault'} icon={share ? 'send' : 'check'} onPress={save} loading={busy} size="lg" />
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  glassBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, height: 36 },
  shutterRow: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xxl },
  shutterOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
