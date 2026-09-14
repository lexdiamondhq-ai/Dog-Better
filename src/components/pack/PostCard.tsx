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

type Props = { post: FeedPost; index?: number; onLike: () => void; onOpen: () => void };

/**
 * A photo-first card. Who and which dog float over the image on a scrim, so the
 * picture stays the hero and the metadata never pushes it around.
 */
export function PostCard({ post, index = 0, onLike, onOpen }: Props) {
  const t = useTheme();
  const image = publicMediaUrl(post.image_path);
  const who = post.author?.display_name ?? 'A dog lover';
  const dogLine = post.dog ? `${post.dog.name}` : null;

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 6) * 60).springify().damping(18)}>
      <Surface kind="raised" padding={0} radiusSize="xl" style={styles.card}>
        <Tap onPress={onOpen} haptic="selection" scaleTo={0.985}>
          {image ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
              <View style={styles.overlay} pointerEvents="none">
                {/* A dark scrim rather than glass: it stays legible over any photo, and Liquid Glass does not render inside lists. */}
                <View style={styles.who}>
                  <DogAvatar uri={post.dog?.avatar_url} size={26} ring={false} />
                  <Text variant="label" numberOfLines={1} style={{ maxWidth: 180, color: palette.paper }}>
                    {dogLine ? `${dogLine} with ${who}` : who}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.textOnly, { backgroundColor: t.furLight }]}>
              <View style={styles.row}>
                <DogAvatar uri={post.dog?.avatar_url} size={30} ring={false} />
                <Text variant="label" tone="secondary">
                  {dogLine ? `${dogLine} with ${who}` : who}
                </Text>
              </View>
              <Text variant="title">{post.caption}</Text>
            </View>
          )}
        </Tap>

        <View style={styles.footer}>
          {image && post.caption ? (
            <Text variant="body" numberOfLines={3} style={{ flex: 1 }}>
              {post.caption}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

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
  overlay: { position: 'absolute', left: space.md, bottom: space.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 4, paddingRight: space.md, height: 36, borderRadius: radius.pill, backgroundColor: 'rgba(28, 20, 14, 0.62)' },
  textOnly: { padding: space.xl, gap: space.md, minHeight: 160, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, flexDirection: 'row' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, paddingVertical: space.md, marginTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingVertical: 4 },
});
