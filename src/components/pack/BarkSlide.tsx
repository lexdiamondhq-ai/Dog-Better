import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import type { FeedPost } from '@/lib/pack';
import { publicMediaUrl } from '@/lib/supabase';
import { palette, space } from '@/theme/tokens';

type Props = {
  bark: FeedPost;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onLike: () => void;
  onDelete?: () => void;
  height: number;
};

export function BarkSlide({ bark, active, muted, onToggleMute, onLike, onDelete, height }: Props) {
  const insets = useSafeAreaInsets();
  const url = publicMediaUrl(bark.image_path) ?? '';
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  // expo-video exposes an imperative player whose state is set by property assignment.
  // The React Compiler cannot see that this object is a native handle, so the two writes are marked.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (active) player.play();
    else {
      player.pause();
      // eslint-disable-next-line react-hooks/immutability
      player.currentTime = 0;
    }
  }, [active, player]);

  return (
    <View style={{ height, backgroundColor: palette.espressoDeep }}>
      <Tap onPress={onToggleMute} haptic="selection" style={StyleSheet.absoluteFill} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      </Tap>
      <View style={[styles.meta, { paddingBottom: insets.bottom + 24, paddingLeft: space.lg }]} pointerEvents="box-none">
        <View style={{ flex: 1, gap: 6, paddingRight: 72 }}>
          <View style={styles.who}>
            <DogAvatar uri={bark.dog?.avatar_url} size={36} ring={false} />
            <Text variant="headline" style={{ color: palette.paper }}>
              {bark.dog?.name ?? 'A dog'}
            </Text>
          </View>
          {bark.caption ? (
            <Text variant="body" style={{ color: 'rgba(250,243,230,0.88)' }} numberOfLines={3}>
              {bark.caption}
            </Text>
          ) : null}
        </View>
        <View style={styles.rail}>
          <Tap onPress={onLike} haptic="medium" style={styles.railBtn} accessibilityLabel={bark.liked ? 'Unlike' : 'Like'}>
            <Icon name="like" size={26} color={bark.liked ? '#E4576B' : palette.paper} />
            <Text variant="caption" style={{ color: palette.paper }}>
              {bark.likes}
            </Text>
          </Tap>
          <Tap onPress={onToggleMute} haptic="selection" style={styles.railBtn} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
            <Icon name={muted ? 'video' : 'mic'} size={22} color={palette.paper} />
          </Tap>
          {onDelete ? (
            <Tap onPress={onDelete} haptic="medium" style={styles.railBtn} accessibilityLabel="Delete bark">
              <Icon name="trash" size={22} color={palette.paper} />
            </Tap>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rail: { alignItems: 'center', gap: space.lg, paddingRight: space.md },
  railBtn: { alignItems: 'center', gap: 4 },
});
