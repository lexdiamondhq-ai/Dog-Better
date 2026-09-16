import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdSlot } from '@/components/ads/AdSlot';
import { LookOrb } from '@/components/look/LookOrb';
import { EarnBadge } from '@/components/points/EarnBadge';
import { WalkCard } from '@/components/track/WalkCard';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { dailyCalories } from '@/engine/foodSafety';
import { REWARDS } from '@/engine/rewards';
import { usePoints } from '@/lib/points';
import { humanize, relativeTime, useDogActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { usePreferences } from '@/lib/preferences';
import { supabase } from '@/lib/supabase';
import { formatWeight, fromKg, parseWeightInput } from '@/lib/units';
import { kindMeta, reminderColor, useReminders } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function Track() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, refresh } = useDogs();
  const { award, total, today } = usePoints();
  const a = useDogActivity(dog);
  const { weightUnit } = usePreferences();
  const reminders = useReminders(dog?.id);
  const nextEvent = reminders.upcoming[0];
  const [weightInput, setWeightInput] = useState('');
  const [showWeight, setShowWeight] = useState(false);
  const [saving, setSaving] = useState(false);

  const weightKg = dog?.weight_kg ? Number(dog.weight_kg) : null;
  const kcal = weightKg ? dailyCalories(weightKg) : null;
  const treatBudget = kcal ? Math.round(kcal * 0.1) : null;
  const weightLabel = formatWeight(weightKg, weightUnit);

  const saveWeight = async () => {
    const kg = parseWeightInput(weightInput, weightUnit);
    if (!dog || !user || kg == null) return;
    setSaving(true);
    await supabase.from('weight_entries').insert({ dog_id: dog.id, owner_id: user.id, weight_kg: kg });
    await award({ kind: 'weight', key: `weight:${dog.id}:${new Date().toISOString().slice(0, 10)}`, dogId: dog.id });
    await supabase.from('dogs').update({ weight_kg: kg }).eq('id', dog.id);
    await Promise.all([refresh(), a.reload()]);
    setWeightInput('');
    setShowWeight(false);
    setSaving(false);
  };

  const trend = (() => {
    if (a.weights.length < 2) return null;
    const deltaKg = Number(a.weights[0].weight_kg) - Number(a.weights[a.weights.length - 1].weight_kg);
    if (Math.abs(deltaKg) < 0.2) return 'Steady';
    const shown = fromKg(deltaKg, weightUnit);
    return `${shown > 0 ? '+' : ''}${shown.toFixed(1)} ${weightUnit} since ${relativeTime(a.weights[a.weights.length - 1].recorded_at)}`;
  })();

  return (
    <View style={{ flex: 1 }}>
    <Screen dock refreshing={a.refreshing} onRefresh={a.refresh}>
      <ScreenHeader title="Log" subtitle={`${dog?.name ?? 'Your dog'} · walks, food, weight, health`} />

      <Tap onPress={() => router.push('/(app)/settings/points')} haptic="selection" style={[styles.jar, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
        <Icon name="paw" size={18} color={t.accentDeep} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{total.toLocaleString()} treats</Text>
          <Text variant="caption" tone="secondary">
            {today} earned today
          </Text>
        </View>
        <EarnBadge points={REWARDS.walk.points} />
      </Tap>

      {dog ? (
        <Tap onPress={() => router.push('/(app)/calendar')} haptic="selection" style={[styles.cal, { backgroundColor: t.bgRaised, borderColor: t.border }]} accessibilityLabel="Open calendar">
          <View style={[styles.calIcon, { backgroundColor: nextEvent ? reminderColor(nextEvent) : t.surface }]}>
            <Icon name="calendar" size={20} color={nextEvent ? t.onMeaning : t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Calendar</Text>
            <Text variant="caption" tone="secondary">
              {nextEvent ? `${nextEvent.title} · ${nextEvent.date === reminders.today ? 'today' : nextEvent.date} ${nextEvent.time}` : reminders.count ? `${reminders.count} events` : 'Meds, vet, walks'}
            </Text>
          </View>
          {nextEvent ? (
            <View style={[styles.calDot, { backgroundColor: kindMeta(nextEvent.kind).color }]} />
          ) : (
            <Icon name="chevron" size={14} color={t.textTertiary} />
          )}
        </Tap>
      ) : null}

      {dog && user ? (
        <Section title="Walks">
          <WalkCard dogId={dog.id} ownerId={user.id} dogName={dog.name} />
        </Section>
      ) : null}

      <AdSlot placement="track" />

      <Section title="Food">
        <Surface kind="grouped" style={{ gap: space.lg }}>
          <View style={styles.statRow}>
            <Stat label="Daily target" value={kcal ? `${kcal}` : '--'} unit="kcal" />
            <Stat label="Treat budget" value={treatBudget ? `${treatBudget}` : '--'} unit="kcal" />
            <Stat label="Meals today" value={`${a.mealsToday.length}`} unit="logged" />
          </View>
          <Text variant="caption" tone="tertiary">
            {weightKg ? `Resting energy at ${weightLabel}. Puppies, working dogs, and seniors differ.` : 'Log a weight to unlock calories.'}
          </Text>
          <Button label="Scan a treat" icon="scan" kind="secondary" onPress={() => router.push('/(app)/scan')} />
        </Surface>
        {a.scans.length ? (
          <Surface kind="grouped" padding={0}>
            {a.scans.slice(0, 4).map((s, i) => (
              <View key={s.id} style={[styles.row, i < Math.min(4, a.scans.length) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={[styles.verdictDot, { backgroundColor: { safe: t.good, caution: t.warn, danger: t.bad, unknown: t.textTertiary }[s.verdict] ?? t.brand }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {s.product_name ?? 'Scanned item'}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {s.brand ?? humanize(s.verdict)} - {relativeTime(s.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </Surface>
        ) : null}
      </Section>

      <Section
        title="Weight"
        action={
          <Tap onPress={() => setShowWeight((v) => !v)} haptic="selection">
            <Text variant="label" tone="brand">
              {showWeight ? 'Cancel' : 'Log'}
            </Text>
          </Tap>
        }>
        <Surface kind="grouped" style={{ gap: space.md }}>
          <View style={styles.weightRow}>
            <Icon name="weight" size={22} color={t.brand} />
            <View style={{ flex: 1 }}>
              <Text variant="title">{weightLabel ?? 'No weight yet'}</Text>
              <Text variant="caption" tone="secondary">
                {trend ?? (a.weights[0] ? `Logged ${relativeTime(a.weights[0].recorded_at)}` : 'Monthly is enough')}
              </Text>
            </View>
          </View>
          {showWeight ? (
            <View style={styles.weightForm}>
              <View style={{ flex: 1 }}>
                <Field placeholder={weightUnit === 'lb' ? 'e.g. 28.5' : 'e.g. 12.4'} value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" suffix={weightUnit} autoFocus />
              </View>
              <Button label={`Save  +${REWARDS.weight.points}`} loading={saving} onPress={saveWeight} />
            </View>
          ) : null}
          {a.weights.length > 1 ? <Sparkline values={a.weights.map((w) => Number(w.weight_kg)).reverse()} /> : null}
        </Surface>
      </Section>

      <AdSlot placement="track-end" />

      <Section
        title="Health"
        action={
          <Tap onPress={() => router.push('/(app)/symptoms')} haptic="selection">
            <Text variant="label" tone="brand">
              Log
            </Text>
          </Tap>
        }>
        {a.health.length ? (
          <Surface kind="grouped" padding={0}>
            {a.health.slice(0, 8).map((h, i) => (
              <View key={h.id} style={[styles.row, i < Math.min(8, a.health.length) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={[styles.verdictDot, { backgroundColor: { green: t.good, amber: t.warn, red: t.bad }[h.triage] ?? t.brand }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {h.symptoms.map(humanize).join(', ')}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {{ green: 'Home', amber: 'Vet within 24h', red: 'Emergency' }[h.triage]} - {relativeTime(h.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </Surface>
        ) : (
          <Text variant="body" tone="secondary">
            Nothing logged. If something is off, start here.
          </Text>
        )}
      </Section>
    </Screen>
    <LookOrb />
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="secondary">
        {unit}
      </Text>
    </View>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const t = useTheme();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const range = Math.max(0.5, mean * 0.1, max - min);
  return (
    <View style={styles.spark}>
      {values.map((v, i) => (
        <View key={i} style={styles.sparkCol}>
          <View style={[styles.sparkBar, { height: 12 + ((v - min) / range) * 36, backgroundColor: i === values.length - 1 ? t.brand : t.surfaceStrong }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  jar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  cal: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  calIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calDot: { width: 10, height: 10, borderRadius: 5 },
  statRow: { flexDirection: 'row', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  verdictDot: { width: 10, height: 10, borderRadius: 5 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  weightForm: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 52 },
  sparkCol: { flex: 1, maxWidth: 28, alignItems: 'center', justifyContent: 'flex-end' },
  sparkBar: { width: '100%', borderRadius: 6 },
});
