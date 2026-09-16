import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { REWARDS } from '@/engine/rewards';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { pickBarkVideo, uploadVaultFile, type PickedVideo } from '@/lib/media';
import { usePoints } from '@/lib/points';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function NewBark() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const { award } = usePoints();
  const [clip, setClip] = useState<PickedVideo | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (from: 'camera' | 'library') => {
    setError(null);
    const next = await pickBarkVideo(from);
    if (!next) {
      setError('Pick a clip between 1 and 60 seconds.');
      return;
    }
    setClip(next);
  };

  const post = async () => {
    if (!user || !clip) return;
    setBusy(true);
    setError(null);
    try {
      const image_path = await uploadVaultFile({
        bucket: 'media',
        userId: user.id,
        folder: 'barks',
        uri: clip.uri,
        name: clip.name,
        mime: clip.mime,
      });
      const { error: err } = await supabase.from('posts').insert({
        author_id: user.id,
        dog_id: dog?.id ?? null,
        caption: caption.trim() || null,
        image_path,
        circle_id: null,
      });
      if (err) throw err;
      await award({ kind: 'post', key: `bark:${user.id}:${Date.now()}`, dogId: dog?.id });
      router.replace('/(app)/barks');
    } catch (e) {
      setError(humanizeError(e, 'Could not post that bark.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader title="New bark" subtitle="1 to 60 seconds. Scrolls with every other bark." onBack={() => router.back()} large={false} />

      {clip ? <Preview uri={clip.uri} onClear={() => setClip(null)} seconds={clip.durationSec} /> : (
        <View style={styles.pickRow}>
          <PickTile icon="video" label="Record" onPress={() => void pick('camera')} />
          <PickTile icon="photo" label="Library" onPress={() => void pick('library')} />
        </View>
      )}

      <Animated.View entering={FadeInUp.delay(80)}>
        <Surface kind="raised" style={{ gap: space.lg }}>
          <Field placeholder={dog ? `What is ${dog.name} doing?` : 'A short caption'} value={caption} onChangeText={setCaption} maxLength={120} error={error ?? undefined} />
          <Button label={`Post bark  +${REWARDS.post.points}`} icon="send" onPress={post} loading={busy} disabled={!clip} size="lg" />
        </Surface>
      </Animated.View>
    </Screen>
  );
}

function Preview({ uri, onClear, seconds }: { uri: string; onClear: () => void; seconds: number }) {
  const t = useTheme();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={[styles.preview, { borderColor: t.border }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <Tap onPress={onClear} haptic="selection" style={[styles.remove, { backgroundColor: t.scrim }]} accessibilityLabel="Remove clip">
        <Icon name="close" size={16} color="#FFF" />
      </Tap>
      <View style={[styles.badge, { backgroundColor: t.scrim }]}>
        <Text variant="caption" style={{ color: '#FFF' }}>
          {seconds}s
        </Text>
      </View>
    </View>
  );
}

function PickTile({ icon, label, onPress }: { icon: 'video' | 'photo'; label: string; onPress: () => void }) {
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
  pickRow: { flexDirection: 'row', gap: space.md },
  tile: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  preview: { aspectRatio: 9 / 16, maxHeight: 420, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, alignSelf: 'center', width: '72%' },
  remove: { position: 'absolute', top: space.md, right: space.md, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', left: space.md, bottom: space.md, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
});
