import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { track } from '@/lib/analytics';
import { useDogs } from '@/lib/dogs';
import { LOOK_FOCUSES, lookAtPhoto, type LookFocus, type LookResult } from '@/lib/look';
import { pickFromLibrary } from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space } from '@/theme/tokens';

export default function LookScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dog } = useDogs();
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef<CameraView>(null);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [uri, setUri] = useState<string | null>(null);
  const [focus, setFocus] = useState<LookFocus>('whats');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookResult | null>(null);

  // Camera stays off until they tap Allow. An unsolicited prompt fires before this copy can be read.

  /** The server owns the free quota. A quota answer still shows the checklist, then offers Premium. */
  const run = async (photoUri: string, at: LookFocus) => {
    setBusy(true);
    const looked = await lookAtPhoto(photoUri, at, dog);
    setResult(looked);
    setBusy(false);
    void track('look_run', { focus: at, source: looked.source, reason: looked.reason ?? null });
    if (looked.reason === 'quota') router.push({ pathname: '/paywall', params: { from: 'look' } });
  };

  const apply = async (next: string | null) => {
    if (!next) return;
    setUri(next);
    setResult(null);
    await run(next, focus);
  };

  const shoot = async () => {
    const photo = await cam.current?.takePictureAsync({ quality: 0.85 });
    await apply(photo?.uri ?? null);
  };

  const chooseFocus = (nextFocus: LookFocus) => {
    setFocus(nextFocus);
  };

  const sourceLabel = result ? (result.source === 'ai' ? 'AI looked at this photo' : 'Checklist') : busy ? 'Looking' : 'Photo helper';

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {permission.granted || uri ? <StatusBar style="light" /> : null}

      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : permission.granted ? (
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.bg, padding: space.xl, gap: space.md }]}>
          <Icon name="sparkle" size={40} color={t.brand} />
          <Text variant="title" align="center">
            Camera for Look
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Point it at {dog?.name ?? 'your dog'}. We look at the photo and give you a checklist for that spot. You can also pick one from your library.
          </Text>
          <Button label="Allow camera" onPress={requestPermission} />
          <Button label="Upload from library" icon="photo" kind="ghost" onPress={() => void pickFromLibrary().then(apply)} />
        </View>
      )}

      {!uri && permission.granted ? (
        <View style={[styles.banner, { top: insets.top + 58 }]} pointerEvents="none">
          <View style={styles.bannerInner}>
            <Icon name="sparkle" size={16} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ color: palette.paper }}>
                Photo helper
              </Text>
              <Text variant="caption" style={{ color: 'rgba(250,243,230,0.86)' }}>
                A model looks at the photo when one is available. Not a vet. Close up, daylight if you can.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <Tap onPress={() => (uri ? (setUri(null), setResult(null)) : router.back())} haptic="selection" accessibilityLabel={uri ? 'Retake' : 'Close'}>
          <Glass borderRadius={22} style={styles.glassBtn}>
            <Icon name={uri ? 'back' : 'close'} size={18} />
          </Glass>
        </Tap>
        <Glass borderRadius={radius.pill} style={styles.pill}>
          <Icon name="sparkle" size={14} color={t.brand} />
          <Text variant="label">Look</Text>
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
        <View style={[styles.shutterRow, { paddingBottom: insets.bottom + space.xl }]}>
          <Tap onPress={() => void pickFromLibrary().then(apply)} haptic="selection" accessibilityLabel="Upload from library">
            <Glass borderRadius={22} style={styles.glassBtn}>
              <Icon name="photo" size={18} />
            </Glass>
          </Tap>
          <Tap onPress={shoot} haptic="heavy" scaleTo={0.9} accessibilityLabel="Look at this photo">
            <View style={styles.shutterOuter}>
              <View style={[styles.shutterInner, { backgroundColor: t.accent }]} />
            </View>
          </Tap>
          <View style={{ width: 44 }} />
        </View>
      ) : null}

      {uri ? (
        <Animated.View entering={FadeInUp.duration(260)} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Surface kind="raised" radiusSize="xl" style={{ gap: space.md }}>
            <View style={styles.row}>
              <Text variant="headline" style={{ flex: 1 }}>
                {busy ? 'Looking at this photo' : result?.title ?? 'Look at this photo'}
              </Text>
              <Text variant="micro" tone="tertiary">
                {sourceLabel}
              </Text>
            </View>
            <View style={styles.chips}>
              {LOOK_FOCUSES.map((f) => (
                <Chip key={f.id} label={f.label} selected={focus === f.id} onPress={() => chooseFocus(f.id)} />
              ))}
            </View>
            {result ? (
              <>
                <Text variant="body">{result.summary}</Text>
                {result.checks.map((c) => (
                  <Text key={c} variant="caption" tone="secondary">
                    · {c}
                  </Text>
                ))}
                <Text variant="bodyStrong">{result.next}</Text>
                <Text variant="caption" tone="tertiary">
                  {result.caution}
                </Text>
                {result.hasDog === false ? (
                  <Button
                    label="Retake with the dog in frame"
                    icon="camera"
                    onPress={() => {
                      setUri(null);
                      setResult(null);
                    }}
                  />
                ) : null}
                {result.source === 'local' && result.reason === 'quota' ? (
                  <Text variant="caption" tone="secondary">
                    Three model Looks a day are free. Premium raises that to forty.
                  </Text>
                ) : null}
                {result.source === 'local' && result.reason === 'offline' ? (
                  <Text variant="caption" tone="secondary">
                    Offline, so this is the built-in checklist. Try again when you are connected.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="body" tone="secondary">
                Give it a second.
              </Text>
            )}
            <View style={styles.row}>
              {uri ? <Button label="Look again" icon="sparkle" kind="secondary" onPress={() => void run(uri, focus)} loading={busy} /> : null}
              <Button label="Something off" icon="detective" kind="secondary" onPress={() => router.push('/(app)/symptoms')} style={{ flex: 1 }} />
              <Button label="Done" kind="ghost" onPress={() => router.back()} />
            </View>
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, zIndex: 2 },
  banner: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 2 },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(20,14,11,0.62)',
  },
  glassBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, height: 36 },
  shutterRow: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xxl },
  shutterOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33 },
  sheet: { position: 'absolute', left: space.md, right: space.md, bottom: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
});
