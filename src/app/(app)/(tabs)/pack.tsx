import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { PostCard } from '@/components/pack/PostCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useFeed } from '@/lib/pack';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Pack() {
  const t = useTheme();
  const router = useRouter();
  const feed = useFeed();

  return (
    <Screen rail refreshing={feed.refreshing} onRefresh={feed.refresh}>
      <ScreenHeader
        eyebrow="Pack"
        title="The pack"
        subtitle="Good dogs, shared."
        trailing={
          <Tap onPress={() => router.push('/(app)/new-post')} haptic="medium" style={[styles.share, { backgroundColor: t.brand }]} accessibilityLabel="Share a moment">
            <Icon name="plus" size={20} color={t.onBrand} />
          </Tap>
        }
      />

      {feed.loading ? null : feed.posts.length === 0 ? (
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Surface kind="fur" style={styles.empty}>
            <Image source={require('@/assets/brand/mascot.png')} style={{ width: 140, height: 120 }} contentFit="contain" />
            <Text variant="title" align="center">
              Quiet in here
            </Text>
            <Text variant="body" tone="secondary" align="center">
              Be the first to share a snap, a win, or a question with the pack.
            </Text>
            <Button label="Share a moment" icon="camera" onPress={() => router.push('/(app)/new-post')} />
          </Surface>
        </Animated.View>
      ) : (
        feed.posts.map((p, i) => (
          <PostCard key={p.id} post={p} index={i} onLike={() => feed.like(p)} onOpen={() => router.push({ pathname: '/(app)/post/[id]', params: { id: p.id } })} />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  share: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
});
