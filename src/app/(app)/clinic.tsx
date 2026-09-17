import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { medsLineFromNotes } from '@/engine/sheetMeds';
import { humanize, relativeTime, useDogActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { shareClinicFile } from '@/lib/exportData';
import { usePremiumGate } from '@/lib/gates';
import { buildClinicPack, buildHandoffSheet } from '@/lib/handoff';
import { usePreferences } from '@/lib/preferences';
import { fromKg } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/**
 * The folder they used to forget at home. Facts the clinic can keep.
 * Not a diagnosis. Memory and handoff only.
 */
export default function Clinic() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const a = useDogActivity(dog);
  const { weightUnit } = usePreferences();
  const gate = usePremiumGate();
  const [busy, setBusy] = useState(false);

  const pack = dog ? buildClinicPack({ dog, ownerEmail: user?.email, weightUnit, weights: a.weights, health: a.health, scans: a.scans }) : '';
  const weights = [...a.weights].reverse();

  // Reading the folder is free. The file the clinic keeps is the Premium part.
  const sendPack = async () => {
    if (!dog) return;
    if (!gate.require('clinic_pack')) return;
    setBusy(true);
    try {
      await shareClinicFile(dog.name, pack);
    } finally {
      setBusy(false);
    }
  };

  const sendSheet = async () => {
    if (!dog) return;
    await Share.share({ message: buildHandoffSheet(dog, user?.email, weightUnit), title: `${dog.name} care sheet` });
  };

  return (
    <Screen>
      <ScreenHeader title="Clinic pack" subtitle={dog ? `${dog.name}'s folder. Memory, not a diagnosis.` : 'Pick a dog first'} onBack={() => router.back()} />

      <Text variant="caption" tone="tertiary">
        Hand this over in the room. The clinician decides what it means. You just stopped guessing from memory.
      </Text>

      <View style={styles.row}>
        <Button label={gate.allows('clinic_pack') ? 'Send clinic pack' : 'Send clinic pack (Premium)'} icon="share" onPress={sendPack} loading={busy} style={{ flex: 1 }} disabled={!dog} />
        <Button label="Care sheet" icon="document" kind="secondary" onPress={sendSheet} disabled={!dog} />
      </View>
      {!gate.allows('clinic_pack') ? (
        <Text variant="caption" tone="tertiary">
          Everything below is free to read. Premium turns it into a file the clinic can keep. The care sheet is always free.
        </Text>
      ) : null}

      <Section title="At a glance">
        <Surface kind="grouped" padding={0}>
          <Row label="Breed / sex" value={[dog?.breed, dog?.sex].filter(Boolean).join(' · ') || 'Not set'} />
          <Row label="Allergies" value={dog?.allergies?.length ? dog.allergies.join(', ') : 'None logged'} />
          <Row label="Medications" value={medsLineFromNotes(dog?.notes ?? null) ?? 'None pulled from a visit'} />
          <Row label="Clinic" value={dog?.vet_name ?? 'Not set'} />
          <Row label="Microchip" value={dog?.microchip ?? 'Not set'} last />
        </Surface>
      </Section>

      <Section title="Weight trend">
        {weights.length ? (
          <Surface kind="grouped" style={{ gap: space.md }}>
            <View style={styles.spark}>
              {weights.map((w, i) => {
                const nums = weights.map((x) => Number(x.weight_kg));
                const min = Math.min(...nums);
                const max = Math.max(...nums);
                const range = Math.max(0.4, max - min);
                return <View key={w.id} style={[styles.bar, { height: 14 + ((Number(w.weight_kg) - min) / range) * 40, backgroundColor: i === weights.length - 1 ? t.brand : t.surfaceStrong }]} />;
              })}
            </View>
            {weights.slice(-5).reverse().map((w) => (
              <Text key={w.id} variant="caption" tone="secondary">
                {new Date(w.recorded_at).toLocaleDateString()} · {fromKg(Number(w.weight_kg), weightUnit).toFixed(1)} {weightUnit}
              </Text>
            ))}
          </Surface>
        ) : (
          <Text variant="body" tone="secondary">
            No weights yet. Log one in Track so the clinic sees a line, not a guess.
          </Text>
        )}
      </Section>

      <Section title="Symptom timeline">
        {a.health.length ? (
          <Surface kind="grouped" padding={0}>
            {a.health.slice(0, 10).map((h, i) => (
              <Animated.View key={h.id} entering={FadeInUp.delay(Math.min(i, 6) * 40)} style={[styles.sym, i < Math.min(10, a.health.length) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={[styles.dot, { backgroundColor: { green: t.good, amber: t.warn, red: t.bad }[h.triage] ?? t.brand }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{h.symptoms.map(humanize).join(', ')}</Text>
                  <Text variant="caption" tone="secondary">
                    {{ green: 'Logged as home watch', amber: 'Logged as vet within 24h', red: 'Logged as urgent' }[h.triage]} · {relativeTime(h.created_at)}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </Surface>
        ) : (
          <Text variant="body" tone="secondary">
            Nothing logged. If something is off, use Log a symptom. We store what you saw, not what it is.
          </Text>
        )}
      </Section>

      <Button label="Open Emergency" icon="emergency" kind="ghost" onPress={() => router.push('/(app)/emergency')} />
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.meta, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56 },
  bar: { flex: 1, maxWidth: 22, borderRadius: 6 },
  sym: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  meta: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 2 },
});
