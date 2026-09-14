import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { captureWithCamera, pickFromLibrary, uploadImage } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function NewPost() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, dogs, setActiveDog } = useDogs();

  const [uri, setUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost = !!uri || caption.trim().length > 0;

  const post = async () => {
    if (!user || !canPost) return;
    setBusy(true);
    setError(null);
    try {
      const image_path = uri ? await uploadImage({ bucket: 'media', userId: user.id, folder: 'posts', uri }) : null;
      const { error: err } = await supabase.from('posts').insert({ author_id: user.id, dog_id: dog?.id ?? null, caption: caption.trim() || null, image_path });
      if (err) throw err;
      router.back();
    } catch (e) {
      setError(humanizeError(e, 'Could not post this moment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow="Pack" title="Share a moment" onBack={() => router.back()} large={false} />

      <Animated.View entering={FadeInUp.delay(40).springify().damping(18)}>
        {uri ? (
          <Animated.View entering={FadeIn} style={[styles.preview, { borderColor: t.border }]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <Tap onPress={() => setUri(null)} haptic="selection" style={[styles.remove, { backgroundColor: t.espressoOverlay }]} accessibilityLabel="Remove photo">
              <Icon name="close" size={16} color="#FFF" />
            </Tap>
          </Animated.View>
        ) : (
          <View style={styles.pickRow}>
            <PickTile icon="camera" label="Camera" onPress={async () => setUri(await captureWithCamera([4, 5]))} />
            <PickTile icon="photo" label="Library" onPress={async () => setUri(await pickFromLibrary([4, 5]))} />
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120)}>
        <Surface kind="raised" style={{ gap: space.lg }}>
          <Field placeholder={dog ? `What did ${dog.name} get up to?` : 'Say something to the pack'} value={caption} onChangeText={setCaption} multiline maxLength={400} style={{ minHeight: 90 }} error={error ?? undefined} />
          {dogs.length > 1 ? (
            <View style={{ gap: space.sm }}>
              <Text variant="label" tone="secondary">
                Posting as
              </Text>
              <View style={styles.dogRow}>
                {dogs.map((d) => (
                  <Tap key={d.id} onPress={() => setActiveDog(d.id)} haptic="selection" style={[styles.dogChip, { backgroundColor: d.id === dog?.id ? t.brand : t.surface }]}>
                    <DogAvatar uri={d.avatar_url} size={24} ring={false} />
                    <Text variant="label" style={{ color: d.id === dog?.id ? t.onBrand : t.text }}>
                      {d.name}
                    </Text>
                  </Tap>
                ))}
              </View>
            </View>
          ) : null}
          <Button label="Share with the pack" icon="send" onPress={post} loading={busy} disabled={!canPost} size="lg" />
        </Surface>
      </Animated.View>
    </Screen>
  );
}

function PickTile({ icon, label, onPress }: { icon: 'camera' | 'photo'; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} haptic="medium" style={{ flex: 1 }}>
      <Surface kind="fur" style={styles.tile}>
        <Icon name={icon} size={28} color={t.brand} />
        <Text variant="bodyStrong">{label}</Text>
      </Surface>
    </Tap>
  );
}

const styles = StyleSheet.create({
  preview: { aspectRatio: 4 / 5, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1 },
  remove: { position: 'absolute', top: space.md, right: space.md, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  pickRow: { flexDirection: 'row', gap: space.md },
  tile: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  dogRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dogChip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 6, paddingRight: space.md, height: 36, borderRadius: radius.pill },
});
