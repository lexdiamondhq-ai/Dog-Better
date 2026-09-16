import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { GroupedList, Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { REWARD_LIST, pointsLabel } from '@/engine/rewards';
import { relativeTime } from '@/lib/activity';
import { useBetterLevel, usePoints } from '@/lib/points';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function PointsSettings() {
  const t = useTheme();
  const router = useRouter();
  const { total, today, entries } = usePoints();
  const level = useBetterLevel();

  return (
    <Screen>
      <ScreenHeader title="Treat jar" subtitle="A running tally of the useful things you do. Never taken away. Never sold." onBack={() => router.back()} large={false} />

      <Surface kind="fur" style={styles.hero}>
        <Text variant="overline" tone="tertiary">
          Better Points
        </Text>
        <Text variant="display">{total.toLocaleString()}</Text>
        <Text variant="body" tone="secondary">
          {level.name} · {today} earned today
        </Text>
        <View style={[styles.track, { backgroundColor: t.surfaceStrong }]}>
          <View style={[styles.fill, { width: `${Math.max(6, level.into * 100)}%`, backgroundColor: t.accent }]} />
        </View>
        <Text variant="caption" tone="tertiary">
          {level.next ? `${level.next.min - total} to ${level.next.name}` : level.line}
        </Text>
      </Surface>

      <Section title="How you earn">
        <GroupedList>
          {REWARD_LIST.map((r, i) => (
            <View key={r.kind} style={[styles.row, i < REWARD_LIST.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
              <View style={[styles.icon, { backgroundColor: t.surface }]}>
                <Icon name={r.icon} size={16} color={t.brand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{r.label}</Text>
                <Text variant="caption" tone="secondary">
                  {r.hint}
                  {r.dailyCap ? ` · up to ${r.dailyCap} a day` : ''}
                </Text>
              </View>
              <Text variant="headline" tone="brand">
                {pointsLabel(r.points)}
              </Text>
            </View>
          ))}
        </GroupedList>
      </Section>

      <Section title="Recent">
        {entries.length === 0 ? (
          <Text variant="body" tone="secondary">
            Log a meal, finish a walk, or open a tip. The first points land here.
          </Text>
        ) : (
          <GroupedList>
            {entries.slice(0, 20).map((e, i) => {
              const spec = REWARD_LIST.find((r) => r.kind === e.kind);
              return (
                <View key={e.id} style={[styles.row, i < Math.min(20, entries.length) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{spec?.label ?? e.kind}</Text>
                    <Text variant="caption" tone="tertiary">
                      {relativeTime(e.at)}
                    </Text>
                  </View>
                  <Text variant="label" tone="brand">
                    {pointsLabel(e.points)}
                  </Text>
                </View>
              );
            })}
          </GroupedList>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', gap: space.sm, paddingVertical: space.xl },
  track: { alignSelf: 'stretch', height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
