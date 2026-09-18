import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

const SPOTS = [
  { id: 'eyes', label: 'Eyes' },
  { id: 'ears', label: 'Ears' },
  { id: 'paws', label: 'Paws' },
  { id: 'coat', label: 'Coat' },
  { id: 'energy', label: 'Energy' },
] as const;

const MARKS = [
  { id: 'fine', label: 'Fine', tone: 'good' as const },
  { id: 'watch', label: 'Watch', tone: 'warn' as const },
  { id: 'urgent', label: 'Urgent', tone: 'bad' as const },
];

type Mark = 'fine' | 'watch' | 'urgent';

/**
 * Five chips. A quiet Sunday look, or any day you want a baseline.
 * Saves as a health log so Today, the score, and the care sheet all see it.
 */
export default function LookOver() {
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triage = useMemo(() => {
    const values = Object.values(marks);
    if (values.includes('urgent')) return 'red';
    if (values.includes('watch')) return 'amber';
    if (values.length === SPOTS.length) return 'green';
    return null;
  }, [marks]);

  const save = async () => {
    if (!dog || !user || !triage) return;
    setBusy(true);
    setError(null);
    try {
      const notes = SPOTS.map((s) => `${s.label}: ${marks[s.id] ?? 'open'}`).join(' · ');
      const { error: err } = await supabase.from('health_logs').insert({
        dog_id: dog.id,
        owner_id: user.id,
        symptoms: ['weekly_look', ...SPOTS.filter((s) => marks[s.id] !== 'fine').map((s) => s.id)],
        severity: triage === 'red' ? 4 : triage === 'amber' ? 2 : 1,
        triage,
        guidance:
          triage === 'red'
            ? 'Something on the look-over was urgent. Call your vet.'
            : triage === 'amber'
              ? 'One or more spots need a watch. Note it for the next visit.'
              : 'Eyes, ears, paws, coat, and energy looked fine to watch at home.',
        notes,
      });
      if (err) throw err;
      if (triage === 'red') router.replace('/(app)/emergency');
      else router.back();
    } catch (e) {
      setError(humanizeError(e, 'Could not save the look-over.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Look-over" subtitle={`${dog?.name ?? 'This dog'} · five spots, one minute`} onBack={() => router.back()} />

      <Surface kind="fur" style={{ gap: space.sm }}>
        <Text variant="headline">{triage === 'red' ? 'Call the vet' : triage === 'amber' ? 'Watch at home, then the clinic' : 'A quiet check'}</Text>
        <Text variant="body" tone="secondary">
          This is not a diagnosis. Fine stays home. Watch writes itself onto the care sheet. Urgent opens Emergency.
        </Text>
      </Surface>

      {SPOTS.map((spot) => (
        <Section key={spot.id} title={spot.label}>
          <View style={styles.row}>
            {MARKS.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                tone={m.tone}
                selected={marks[spot.id] === m.id}
                onPress={() => setMarks((prev) => ({ ...prev, [spot.id]: m.id as Mark }))}
              />
            ))}
          </View>
        </Section>
      ))}

      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : null}

      <Button
        label={triage === 'red' ? 'Save and open Emergency' : 'Save the look-over'}
        icon="check"
        onPress={() => void save()}
        loading={busy}
        disabled={!triage || busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
