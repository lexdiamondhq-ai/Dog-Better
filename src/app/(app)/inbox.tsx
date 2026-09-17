import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { GroupedList, Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/activity';
import { useInbox } from '@/lib/inbox';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Inbox() {
  const t = useTheme();
  const router = useRouter();
  const inbox = useInbox();
  const markSeen = inbox.markCommentsSeen;

  useFocusEffect(
    useCallback(() => {
      void markSeen();
    }, [markSeen]),
  );

  return (
    <Screen>
      <ScreenHeader title="Activity" subtitle="Comments and likes on your photos." onBack={() => router.back()} large={false} />

      {inbox.items.length === 0 ? (
        <Surface kind="grouped" style={styles.empty}>
          <Icon name="bell" size={28} color={t.brand} />
          <Text variant="headline" align="center">
            Nothing new
          </Text>
          <Text variant="body" tone="secondary" align="center">
            When someone comments on or likes a photo you posted, it shows up here.
          </Text>
        </Surface>
      ) : (
        <GroupedList>
          {inbox.items.map((item, i) => (
            <Tap key={item.id} onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: item.postId } })} haptic="selection">
              <View style={[styles.row, i < inbox.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={[styles.icon, { backgroundColor: t.surface }]}>
                  <Icon name={item.kind === 'comment' ? 'comment' : 'like'} size={16} color={t.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {item.preview}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {relativeTime(item.at)}
                  </Text>
                </View>
                <Icon name="chevron" size={14} color={t.textTertiary} />
              </View>
            </Tap>
          ))}
        </GroupedList>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
