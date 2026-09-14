import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Screen, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { greeting, relativeTime, useDogActivity, type TimelineItem } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const FEATURES: { icon: IconName; title: string; line: string; href: Href; tint: 'brand' | 'bad' | 'good' | 'info' }[] = [
  { icon: 'bark', title: 'Bark translator', line: 'What is that bark saying?', href: '/(app)/bark', tint: 'brand' },
  { icon: 'symptoms', title: 'Symptom check', line: 'Vet visit or wait it out?', href: '/(app)/symptoms', tint: 'bad' },
  { icon: 'scan', title: 'Treat scanner', line: 'Safe for this dog?', href: '/(app)/scan', tint: 'good' },
  { icon: 'places', title: 'Safe spaces', line: 'Parks, trails, patios', href: '/(app)/(tabs)/places', tint: 'info' },
];

const MEALS: { kind: 'breakfast' | 'dinner' | 'treat'; label: string; icon: IconName }[] = [
  { kind: 'breakfast', label: 'Breakfast', icon: 'sun' },
  { kind: 'dinner', label: 'Dinner', icon: 'meal' },
  { kind: 'treat', label: 'Treat', icon: 'paw' },
];

export default function Today() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const activity = useDogActivity(dog);
  const [logging, setLogging] = useState<string | null>(null);

  const logMeal = async (kind: 'breakfast' | 'dinner' | 'treat') => {
    if (!dog || !user) return;
    setLogging(kind);
    await supabase.from('meals').insert({ dog_id: dog.id, owner_id: user.id, kind });
    await activity.reload();
    setLogging(null);
  };

  const loggedKinds = new Set(activity.mealsToday.map((m) => m.kind));

  return (
    <Screen rail refreshing={activity.refreshing} onRefresh={activity.refresh}>
      <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={styles.hero}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" tone="tertiary">
            {greeting()}
          </Text>
          <Text variant="hero">{dog?.name ?? 'Your dog'}</Text>
          <Text variant="body" tone="secondary">
            {activity.score.headline}
          </Text>
        </View>
        <Tap onPress={() => router.navigate('/(app)/(tabs)/vault')} haptic="selection" scaleTo={0.94} accessibilityLabel="Open vault">
          <DogAvatar uri={dog?.avatar_url} size={72} />
        </Tap>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(80).springify().damping(18)}>
        <Surface kind="raised" style={styles.scoreCard}>
          <ProgressRing progress={activity.score.total / 100} size={124} stroke={12} color={t.brand} delay={200}>
            <Text variant="display" style={{ lineHeight: 34 }}>
              {activity.score.total}
            </Text>
            <Text variant="overline" tone="tertiary">
              Better
            </Text>
          </ProgressRing>
          <View style={styles.pillars}>
            {activity.score.pillars.map((p, i) => (
              <View key={p.id} style={styles.pillar}>
                <View style={styles.pillarRow}>
                  <Text variant="label">{p.label}</Text>
                  <Text variant="caption" tone="tertiary">
                    {p.score}/{p.max}
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: t.surfaceStrong }]}>
                  <Animated.View
                    entering={FadeInUp.delay(300 + i * 80)}
                    style={[styles.fill, { width: `${Math.max(4, (p.score / p.max) * 100)}%`, backgroundColor: p.score === p.max ? t.good : t.brand }]}
                  />
                </View>
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {p.hint}
                </Text>
              </View>
            ))}
          </View>
        </Surface>
      </Animated.View>

      <Section title="Feed log">
        <View style={styles.mealRow}>
          {MEALS.map((m, i) => {
            const done = loggedKinds.has(m.kind);
            return (
              <Animated.View key={m.kind} entering={FadeInUp.delay(160 + i * 60)} style={{ flex: 1 }}>
                <Tap onPress={() => logMeal(m.kind)} disabled={logging !== null} haptic="medium" style={[styles.meal, { backgroundColor: done ? t.good : t.bgRaised, borderColor: done ? t.good : t.border }]}>
                  <Icon name={done ? 'check' : m.icon} size={20} color={done ? '#FFFDF8' : t.brand} />
                  <Text variant="label" style={{ color: done ? '#FFFDF8' : t.text }}>
                    {m.label}
                  </Text>
                </Tap>
              </Animated.View>
            );
          })}
        </View>
      </Section>

      <Section title="Do better">
        <View style={styles.grid}>
          {FEATURES.map((f, i) => {
            const tint = { brand: t.brand, bad: t.bad, good: t.good, info: t.info }[f.tint];
            return (
              <Animated.View key={f.title} entering={FadeInUp.delay(240 + i * 70).springify().damping(18)} style={styles.tileWrap}>
                <Tap onPress={() => router.push(f.href)} haptic="medium" style={[styles.tile, { backgroundColor: t.bgRaised, borderColor: t.border, shadowColor: t.shadow }]}>
                  <View style={[styles.tileIcon, { backgroundColor: tint }]}>
                    <Icon name={f.icon} size={22} color="#FFFDF8" />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="headline">{f.title}</Text>
                    <Text variant="caption" tone="secondary">
                      {f.line}
                    </Text>
                  </View>
                </Tap>
              </Animated.View>
            );
          })}
        </View>
      </Section>

      <Section title="Recent">
        {activity.timeline.length === 0 ? (
          <Surface kind="tonal" style={{ alignItems: 'center', gap: space.xs }}>
            <Text variant="bodyStrong">Nothing yet</Text>
            <Text variant="caption" tone="secondary" align="center">
              Log a meal or try the bark translator. Everything you do shows up here.
            </Text>
          </Surface>
        ) : (
          <Surface kind="raised" padding={0}>
            {activity.timeline.map((item, i) => (
              <TimelineRow key={item.id} item={item} last={i === activity.timeline.length - 1} />
            ))}
          </Surface>
        )}
      </Section>
    </Screen>
  );
}

function TimelineRow({ item, last }: { item: TimelineItem; last: boolean }) {
  const t = useTheme();
  const icons: Record<TimelineItem['kind'], IconName> = { meal: 'meal', health: 'symptoms', bark: 'bark', scan: 'scan', weight: 'weight' };
  const icon = icons[item.kind];
  const tone = { neutral: t.brand, good: t.good, warn: t.warn, bad: t.bad }[item.tone];
  return (
    <View style={[styles.tlRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
      <View style={[styles.tlIcon, { backgroundColor: t.surface }]}>
        <Icon name={icon} size={16} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{item.title}</Text>
        <Text variant="caption" tone="secondary">
          {item.detail}
        </Text>
      </View>
      <Text variant="caption" tone="tertiary">
        {relativeTime(item.at)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  scoreCard: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  pillars: { flex: 1, gap: space.sm },
  pillar: { gap: 3 },
  pillarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  mealRow: { flexDirection: 'row', gap: space.sm },
  meal: { height: 76, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tileWrap: { width: '48.5%' },
  tile: {
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.md,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  tileIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  tlIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
