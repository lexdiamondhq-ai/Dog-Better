import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarkSlide } from '@/components/pack/BarkSlide';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useBarks } from '@/lib/barks';
import { moderationSheet } from '@/lib/moderation';
import type { FeedPost } from '@/lib/pack';
import { palette, space } from '@/theme/tokens';

// FlatList requires a stable viewabilityConfig identity, so it lives outside the component.
const VIEWABILITY = { viewAreaCoveragePercentThreshold: 80 };

export default function Barks() {
  const router = useRouter();
  const { user } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const feed = useBarks();
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (typeof first?.index === 'number') setActive(first.index);
  }, []);

  const remove = (bark: FeedPost) => {
    Alert.alert('Delete this bark?', 'It leaves Barks for everyone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void feed.remove(bark) },
    ]);
  };

  const report = (bark: FeedPost) => {
    if (!user) return;
    moderationSheet({
      reporterId: user.id,
      targetKind: 'post',
      targetId: bark.id,
      authorId: bark.author_id,
      authorLabel: bark.author?.display_name ?? undefined,
      onDone: () => feed.hide(bark.id),
    });
  };

  return (
    <View style={styles.root}>
      {feed.loading ? null : feed.barks.length === 0 ? (
        <View style={[styles.empty, { paddingTop: insets.top + space.xxl }]}>
          <Text variant="title" style={{ color: palette.paper }} align="center">
            No barks yet
          </Text>
          <Text variant="body" style={{ color: 'rgba(250,243,230,0.7)', textAlign: 'center' }}>
            Short clips, up to 60 seconds, shared with every Dog Better member. Record one and it lands in this scroll.
          </Text>
          <Button label="Record a bark" icon="video" onPress={() => router.push('/(app)/new-bark')} />
        </View>
      ) : (
        <FlatList
          data={feed.barks}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={VIEWABILITY}
          renderItem={({ item, index }) => (
            <BarkSlide
              bark={item}
              active={index === active}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onLike={() => feed.like(item)}
              onDelete={user && item.author_id === user.id ? () => remove(item) : undefined}
              onReport={user && item.author_id !== user.id ? () => report(item) : undefined}
              height={height}
            />
          )}
        />
      )}
      <Tap onPress={() => router.back()} haptic="selection" style={[styles.back, { top: insets.top + 8 }]} accessibilityLabel="Back">
        <Icon name="back" size={20} color={palette.paper} />
      </Tap>
      <Tap onPress={() => router.push('/(app)/new-bark')} haptic="medium" style={[styles.add, { top: insets.top + 8 }]} accessibilityLabel="New bark">
        <Icon name="plus" size={20} color={palette.paper} />
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0705' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xl },
  back: { position: 'absolute', left: space.md, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,14,11,0.45)' },
  add: { position: 'absolute', right: space.md, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,14,11,0.45)' },
});
