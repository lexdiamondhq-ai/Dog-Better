import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { GroupedList, Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useDogActivity } from '@/lib/activity';
import { useDogs } from '@/lib/dogs';
import { useEntitlements } from '@/lib/entitlements';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Score() {
  const t = useTheme();
  const router = useRouter();
  const { dog } = useDogs();
  const { score } = useDogActivity(dog);
  const { isPremium } = useEntitlements();

  return (
    <Screen>
      <ScreenHeader title="Today's score" subtitle={score.headline} onBack={() => router.back()} large={false} />

      <Surface kind="fur" style={styles.hero}>
        <Text variant="display">{score.total}</Text>
        <Text variant="body" tone="secondary">
          Out of {score.max}. What you logged today. {score.available ? `${score.available} still sitting in today’s actions.` : `${dog?.name ?? 'Your dog'} is set.`}
        </Text>
      </Surface>

      <Section title="How it is built">
        <GroupedList>
          {score.pillars.map((p, i) => (
            <View key={p.id} style={[styles.pillar, i < score.pillars.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{p.label}</Text>
                <Text variant="caption" tone="secondary">
                  {p.because}
                </Text>
              </View>
              <Text variant="headline">
                {p.score}
                <Text variant="caption" tone="tertiary">
                  {` / ${p.max}`}
                </Text>
              </Text>
            </View>
          ))}
        </GroupedList>
      </Section>

      {score.nextActions.length ? (
        <Section title="Add points">
          <GroupedList>
            {score.nextActions.map((a, i) => (
              <Tap
                key={`${a.label}-${i}`}
                onPress={() => {
                  if (a.href) router.push(a.href as Href);
                  else router.back();
                }}
                haptic="selection">
                <View style={[styles.pillar, i < score.nextActions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{a.label}</Text>
                    <Text variant="caption" tone="secondary">
                      +{a.points} on the score
                    </Text>
                  </View>
                  <Icon name="chevron" size={14} color={t.textTertiary} />
                </View>
              </Tap>
            ))}
          </GroupedList>
        </Section>
      ) : null}

      {!isPremium ? (
        <Button label="Unlock the full plan" icon="sparkle" kind="secondary" onPress={() => router.push({ pathname: '/paywall', params: { from: 'score' } })} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.sm },
  pillar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
});
