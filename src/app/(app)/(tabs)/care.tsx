import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { dailyCalories } from '@/engine/foodSafety';
import { humanize, relativeTime, useDogActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function Care() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, refresh } = useDogs();
  const a = useDogActivity(dog);
  const [weightInput, setWeightInput] = useState('');
  const [showWeight, setShowWeight] = useState(false);
  const [saving, setSaving] = useState(false);

  const weightKg = dog?.weight_kg ? Number(dog.weight_kg) : null;
  const kcal = weightKg ? dailyCalories(weightKg) : null;
  const treatBudget = kcal ? Math.round(kcal * 0.1) : null;
  const latest = a.health[0];

  const saveWeight = async () => {
    const n = parseFloat(weightInput.replace(',', '.'));
    if (!dog || !user || !Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    const kg = Math.round(n * 10) / 10;
    await supabase.from('weight_entries').insert({ dog_id: dog.id, owner_id: user.id, weight_kg: kg });
    await supabase.from('dogs').update({ weight_kg: kg }).eq('id', dog.id);
    await Promise.all([refresh(), a.reload()]);
    setWeightInput('');
    setShowWeight(false);
    setSaving(false);
  };

  const trend = (() => {
    if (a.weights.length < 2) return null;
    const delta = Number(a.weights[0].weight_kg) - Number(a.weights[a.weights.length - 1].weight_kg);
    if (Math.abs(delta) < 0.2) return 'Steady';
    return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg since ${relativeTime(a.weights[a.weights.length - 1].recorded_at)}`;
  })();

  return (
    <Screen rail refreshing={a.refreshing} onRefresh={a.refresh}>
      <ScreenHeader eyebrow="Care" title="Health and nutrition" subtitle={dog ? `Everything here is sized to ${dog.name}.` : undefined} />

      <Animated.View entering={FadeInUp.delay(60).springify().damping(18)}>
        <Tap onPress={() => router.push('/(app)/symptoms')} haptic="medium">
          <Surface kind="brand" style={styles.heroCard}>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="overline" style={{ color: t.onBrand, opacity: 0.7 }}>
                Symptom checker
              </Text>
              <Text variant="title" tone="onBrand">
                Something off with {dog?.name ?? 'your dog'}?
              </Text>
              <Text variant="body" style={{ color: t.onBrand, opacity: 0.8 }}>
                Log what you see and get a clear answer: home, vet today, or vet now.
              </Text>
            </View>
            <View style={[styles.heroIcon, { backgroundColor: `${t.onBrand}29` }]}>
              <Icon name="symptoms" size={26} color={t.onBrand} />
            </View>
          </Surface>
        </Tap>
      </Animated.View>

      {latest ? (
        <Animated.View entering={FadeInUp.delay(120)}>
          <Surface kind="raised" style={styles.latest}>
            <View style={[styles.triageDot, { backgroundColor: { green: t.good, amber: t.warn, red: t.bad }[latest.triage] ?? t.brand }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{latest.symptoms.map(humanize).join(', ')}</Text>
              <Text variant="caption" tone="secondary">
                {{ green: 'Monitor at home', amber: 'Vet within 24h', red: 'Emergency' }[latest.triage]} - {relativeTime(latest.created_at)}
              </Text>
            </View>
          </Surface>
        </Animated.View>
      ) : null}

      <Section title="Nutrition">
        <Animated.View entering={FadeInUp.delay(160)}>
          <Surface kind="raised" style={{ gap: space.lg }}>
            <View style={styles.statRow}>
              <Stat label="Daily target" value={kcal ? `${kcal}` : '--'} unit="kcal" />
              <Stat label="Treat budget" value={treatBudget ? `${treatBudget}` : '--'} unit="kcal" />
              <Stat label="Meals today" value={`${a.mealsToday.length}`} unit="logged" />
            </View>
            {!weightKg ? (
              <Text variant="caption" tone="tertiary">
                Add a weight below to unlock calorie and portion guidance.
              </Text>
            ) : (
              <Text variant="caption" tone="tertiary">
                Based on resting energy at {weightKg.toFixed(1)} kg for a neutered adult. Puppies, working dogs, and seniors differ; ask your vet.
              </Text>
            )}
            <Button label="Scan a treat" icon="scan" kind="secondary" onPress={() => router.push('/(app)/scan')} />
          </Surface>
        </Animated.View>

        {a.scans.length ? (
          <Surface kind="raised" padding={0}>
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
              {showWeight ? 'Cancel' : 'Log weight'}
            </Text>
          </Tap>
        }>
        <Animated.View entering={FadeInUp.delay(220)}>
          <Surface kind="raised" style={{ gap: space.md }}>
            <View style={styles.weightRow}>
              <View style={[styles.weightIcon, { backgroundColor: t.furLight }]}>
                <Icon name="weight" size={22} color={t.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="display">{weightKg ? `${weightKg.toFixed(1)} kg` : 'No weight yet'}</Text>
                <Text variant="caption" tone="secondary">
                  {trend ?? (a.weights[0] ? `Logged ${relativeTime(a.weights[0].recorded_at)}` : 'Log it monthly to spot changes early')}
                </Text>
              </View>
            </View>
            {showWeight ? (
              <View style={styles.weightForm}>
                <View style={{ flex: 1 }}>
                  <Field placeholder="e.g. 12.4" value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" suffix="kg" autoFocus />
                </View>
                <Button label="Save" loading={saving} onPress={saveWeight} />
              </View>
            ) : null}
            {a.weights.length > 1 ? <Sparkline values={a.weights.map((w) => Number(w.weight_kg)).reverse()} /> : null}
          </Surface>
        </Animated.View>
      </Section>

      {a.health.length ? (
        <Section title="Health log">
          <Surface kind="raised" padding={0}>
            {a.health.slice(0, 6).map((h, i) => (
              <View key={h.id} style={[styles.row, i < Math.min(6, a.health.length) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={[styles.verdictDot, { backgroundColor: { green: t.good, amber: t.warn, red: t.bad }[h.triage] ?? t.brand }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {h.symptoms.map(humanize).join(', ')}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    Severity {h.severity}/5 - {relativeTime(h.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </Surface>
        </Section>
      ) : null}
    </Screen>
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
  // Never let a tiny fluctuation fill the whole chart: the visible range is at least
  // a tenth of the dog's weight, so a 0.3 kg wobble on an 11 kg dog reads as a wobble.
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
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  latest: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  triageDot: { width: 12, height: 12, borderRadius: 6 },
  statRow: { flexDirection: 'row', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  verdictDot: { width: 10, height: 10, borderRadius: 5 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  weightIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  weightForm: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 52 },
  sparkCol: { flex: 1, maxWidth: 28, alignItems: 'center', justifyContent: 'flex-end' },
  sparkBar: { width: '100%', borderRadius: 6 },
});
