import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { SYMPTOMS, type SymptomId } from '@/engine/triage';
import { useDogActivity } from '@/lib/activity';
import { useDogs } from '@/lib/dogs';
import { usePreferences } from '@/lib/preferences';
import { formatWeight } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const RED_FLAGS = SYMPTOMS.filter((s) => s.redFlag);

/**
 * Emergency mode exists to remove panic, not to replace a vet. It starts a clock, gets the
 * critical facts on one screen, and puts the call and the directions one tap away. The intake
 * summary is what the owner reads out (or pastes) at the clinic instead of trying to remember.
 */
export default function Emergency() {
  const t = useTheme();
  const router = useRouter();
  const { dog } = useDogs();
  const a = useDogActivity(dog);
  const { weightUnit } = usePreferences();
  const [startedAt] = useState(() => new Date());
  const [elapsed, setElapsed] = useState('0:00');
  const [signs, setSigns] = useState<SymptomId[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const since = startedAt.getTime();
  const recentMeals = a.meals.filter((m) => since - new Date(m.logged_at).getTime() < 24 * 3600_000);
  const recentScans = a.scans.filter((s) => since - new Date(s.created_at).getTime() < 72 * 3600_000);
  const lastHealth = a.health[0];

  const summary = [
    `EMERGENCY INTAKE - ${dog?.name ?? 'Dog'}`,
    `Started: ${startedAt.toLocaleString()}`,
    [dog?.breed, dog?.sex, formatWeight(dog?.weight_kg, weightUnit), dog?.birthdate ? `born ${dog.birthdate}` : null].filter(Boolean).join(', '),
    '',
    `Observed now: ${signs.length ? signs.map((id) => SYMPTOMS.find((s) => s.id === id)?.label).join(', ') : 'not specified'}`,
    `Allergies: ${dog?.allergies?.length ? dog.allergies.join(', ') : 'none known'}`,
    `Notes/meds: ${dog?.notes ?? 'none'}`,
    `Ate in last 24h: ${recentMeals.length ? recentMeals.map((m) => `${m.kind}${m.label ? ` (${m.label})` : ''} at ${new Date(m.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`).join('; ') : 'no meals logged'}`,
    recentScans.length ? `Treats checked in last 72h: ${recentScans.map((s) => s.product_name ?? s.barcode ?? 'unknown').join('; ')}` : null,
    lastHealth ? `Last symptom log: ${lastHealth.symptoms.join(', ')} (${lastHealth.triage}) on ${new Date(lastHealth.created_at).toLocaleDateString()}` : null,
    dog?.microchip ? `Microchip: ${dog.microchip}` : null,
    dog?.vet_name ? `Regular vet: ${dog.vet_name}${dog.vet_phone ? ` ${dog.vet_phone}` : ''}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const findVet = () => {
    const q = encodeURIComponent('emergency vet');
    Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${q}` : `geo:0,0?q=${q}`);
  };

  const copy = async () => {
    await Clipboard.setStringAsync(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {dog?.vet_phone ? <Button label="Call your vet" icon="phone" kind="danger" size="lg" onPress={() => Linking.openURL(`tel:${dog.vet_phone}`)} style={{ flex: 1 }} /> : null}
          <Button label="Nearest emergency vet" icon="location" kind={dog?.vet_phone ? 'secondary' : 'danger'} size="lg" onPress={findVet} style={{ flex: 1 }} />
        </View>
      }>
      <ScreenHeader eyebrow="Emergency" title="Something is wrong" onBack={() => router.back()} large={false} trailing={<Clock elapsed={elapsed} />} />

      <Animated.View entering={FadeInUp.delay(40).duration(260)}>
        <Surface kind="raised" style={[styles.banner, { borderColor: t.bad, borderWidth: 1.5 }]}>
          <Icon name="emergency" size={26} color={t.bad} />
          <View style={{ flex: 1 }}>
            <Text variant="headline">Go now if you see any of these</Text>
            <Text variant="caption" tone="secondary">
              Do not wait to log more. Call while someone drives.
            </Text>
          </View>
        </Surface>
      </Animated.View>

      <View style={styles.chips}>
        {RED_FLAGS.map((s) => (
          <Chip key={s.id} label={s.label} selected={signs.includes(s.id)} tone="bad" onPress={() => setSigns((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))} />
        ))}
      </View>

      <Section title={`${dog?.name ?? 'Dog'} at a glance`}>
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <Fact label="Weight" value={formatWeight(dog?.weight_kg, weightUnit) ?? 'Not set'} />
          <Fact label="Allergies" value={dog?.allergies?.length ? dog.allergies.join(', ') : 'None known'} />
          <Fact label="Meds and notes" value={dog?.notes ?? 'None'} />
          <Fact label="Ate in last 24h" value={recentMeals.length ? `${recentMeals.length} logged` : 'Nothing logged'} />
          <Fact label="Microchip" value={dog?.microchip ?? 'Not set'} last />
        </Surface>
      </Section>

      <Section title="Intake summary for the clinic">
        <Surface kind="tonal" style={{ gap: space.md }}>
          <Text variant="caption" style={{ fontFamily: 'Menlo', lineHeight: 17 }}>
            {summary}
          </Text>
          <View style={styles.row}>
            <Button label={copied ? 'Copied' : 'Copy'} icon={copied ? 'check' : 'document'} kind="secondary" onPress={copy} style={{ flex: 1 }} />
            <Button label="Send" icon="share" kind="secondary" onPress={() => Share.share({ message: summary })} style={{ flex: 1 }} />
          </View>
        </Surface>
      </Section>

      <Button label="Open clinic pack" icon="document" kind="secondary" onPress={() => router.push('/(app)/clinic')} />

      <Tap onPress={() => router.push('/(app)/snap')} haptic="medium">
        <Surface kind="outline" style={styles.photoRow}>
          <Icon name="camera" size={20} color={t.brand} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            Photo or video of what you see
          </Text>
          <Icon name="chevron" size={16} color={t.textTertiary} />
        </Surface>
      </Tap>

      <Text variant="caption" tone="tertiary" align="center">
        This screen organises facts. It is not medical advice and cannot replace an examination.
      </Text>
    </Screen>
  );
}

function Clock({ elapsed }: { elapsed: string }) {
  const t = useTheme();
  return (
    <View style={[styles.clock, { backgroundColor: t.bad }]}>
      <Icon name="clock" size={14} color="#FFFFFF" />
      <Text variant="label" style={{ color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
        {elapsed}
      </Text>
    </View>
  );
}

function Fact({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.fact, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
      <Text variant="caption" tone="tertiary" style={{ width: 110 }}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: space.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, marginTop: 4 },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
});
