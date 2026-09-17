import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/activity';
import type { FeedPost } from '@/lib/pack';
import { publicMediaUrl } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space } from '@/theme/tokens';

type Props = { post: FeedPost; index?: number; onLike: () => void; onOpen: () => void; onDelete?: () => void; onReport?: () => void };

/**
 * A photo-first card. Who and which dog float over the image on a scrim, so the
 * picture stays the hero and the metadata never pushes it around. Every card someone else posted
 * carries a report action; the author sees delete instead.
 */
export function PostCard({ post, index = 0, onLike, onOpen, onDelete, onReport }: Props) {
  const t = useTheme();
  const image = publicMediaUrl(post.image_path);
  const note = post.caption?.trim();

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 6) * 60).duration(260)}>
      <Surface kind="raised" padding={0} radiusSize="xl" style={styles.card}>
        <Tap onPress={onOpen} haptic="selection" scaleTo={0.985}>
          {image ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
              {note ? (
                <View style={styles.overlay} pointerEvents="none">
                  <View style={styles.who}>
                    <Text variant="label" numberOfLines={3} style={{ maxWidth: 260, color: palette.paper }}>
                      {note}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={[styles.textOnly, { backgroundColor: t.furLight }]}>
              <View style={styles.row}>
                <DogAvatar uri={post.dog?.avatar_url} size={30} ring={false} />
                <Text variant="label" tone="secondary">
                  {post.dog?.name ?? 'A dog lover'}
                </Text>
              </View>
              {note ? <Text variant="title">{note}</Text> : null}
            </View>
          )}
        </Tap>

        <View style={[styles.actions, { borderTopColor: t.border }]}>
          <Tap onPress={onLike} haptic="medium" style={styles.action} accessibilityLabel={post.liked ? 'Unlike' : 'Like'}>
            <Icon name="like" size={20} color={post.liked ? t.bad : t.textSecondary} />
            <Text variant="label" tone={post.liked ? 'bad' : 'secondary'}>
              {post.likes}
            </Text>
          </Tap>
          <Tap onPress={onOpen} haptic="selection" style={styles.action} accessibilityLabel="Comments">
            <Icon name="comment" size={19} color={t.textSecondary} />
            <Text variant="label" tone="secondary">
              {post.comments}
            </Text>
          </Tap>
          {onDelete ? (
            <Tap onPress={onDelete} haptic="medium" style={styles.action} accessibilityLabel="Delete post">
              <Icon name="trash" size={18} color={t.bad} />
            </Tap>
          ) : onReport ? (
            <Tap onPress={onReport} haptic="selection" style={styles.action} accessibilityLabel="Report or block">
              <Icon name="warning" size={18} color={t.textTertiary} />
            </Tap>
          ) : null}
          <Text variant="caption" tone="tertiary" style={{ marginLeft: 'auto' }}>
            {relativeTime(post.created_at)}
          </Text>
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  imageWrap: { aspectRatio: 4 / 5, width: '100%' },
  overlay: { position: 'absolute', left: space.md, right: space.md, bottom: space.md },
  who: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: 'rgba(28, 20, 14, 0.62)' },
  textOnly: { padding: space.xl, gap: space.md, minHeight: 160, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingVertical: 4 },
});
