import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, FadeInUp, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { DURATIONS, runTriage, SYMPTOM_GROUPS, SYMPTOMS, type Duration, type SymptomId, type Triage, type TriageResult } from '@/engine/triage';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Step = 'pick' | 'detail' | 'result';
type Severity = 1 | 2 | 3 | 4 | 5;

const SEVERITY_LABEL: Record<Severity, string> = { 1: 'Barely noticeable', 2: 'Mild', 3: 'Clearly off', 4: 'Struggling', 5: 'Very unwell' };

/**
 * Three beats: what, how bad, verdict. The verdict is a traffic light with reasons,
 * never a wall of text, and the red state puts the vet's number one tap away.
 */
export default function Symptoms() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();

  const [step, setStep] = useState<Step>('pick');
  const [picked, setPicked] = useState<SymptomId[]>([]);
  const [severity, setSeverity] = useState<Severity>(2);
  const [duration, setDuration] = useState<Duration>('day');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<TriageResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (id: SymptomId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const evaluate = () => {
    const ageYears = dog?.birthdate ? (Date.now() - new Date(dog.birthdate).getTime()) / (365.25 * 24 * 3600_000) : null;
    const r = runTriage({ symptoms: picked, severity, duration, ageYears });
    setResult(r);
    setStep('result');
  };

  const save = async () => {
    if (!user || !dog || !result) return;
    setSaving(true);
    await supabase.from('health_logs').insert({
      dog_id: dog.id,
      owner_id: user.id,
      symptoms: picked,
      severity,
      duration,
      triage: result.triage,
      guidance: result.guidance,
      notes: notes.trim() || null,
    });
    setSaving(false);
    setSaved(true);
  };

  const reset = () => {
    setStep('pick');
    setPicked([]);
    setSeverity(2);
    setDuration('day');
    setNotes('');
    setResult(null);
    setSaved(false);
  };

  return (
    <Screen
      keyboardShouldPersistTaps="handled"
      footer={
        step === 'pick' ? (
          <Button label={picked.length ? `Continue with ${picked.length} ${picked.length === 1 ? 'sign' : 'signs'}` : 'Pick at least one sign'} disabled={!picked.length} onPress={() => setStep('detail')} size="lg" icon="chevron" />
        ) : undefined
      }>
      <ScreenHeader
        eyebrow={step === 'result' ? 'Symptom checker' : `Symptom checker${step === 'detail' ? ' - 2 of 2' : ' - 1 of 2'}`}
        title={step === 'pick' ? `What's going on with ${dog?.name ?? 'your dog'}?` : step === 'detail' ? 'How bad, and since when?' : 'Here is what we think'}
        onBack={step === 'pick' ? () => router.back() : step === 'detail' ? () => setStep('pick') : () => setStep('detail')}
        large={step !== 'result'}
      />

      {step === 'pick' ? (
        <Animated.View key="pick" entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft} style={{ gap: space.lg }}>
          {SYMPTOM_GROUPS.map((group) => (
            <Section key={group} title={group}>
              <View style={styles.chips}>
                {SYMPTOMS.filter((s) => s.group === group).map((s) => (
                  <Chip key={s.id} label={s.label} selected={picked.includes(s.id)} onPress={() => toggle(s.id)} tone={s.redFlag ? 'bad' : 'neutral'} icon={s.redFlag && picked.includes(s.id) ? 'warning' : undefined} />
                ))}
              </View>
            </Section>
          ))}
        </Animated.View>
      ) : null}

      {step === 'detail' ? (
        <Animated.View key="detail" entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft} style={{ gap: space.lg }}>
          <Surface kind="raised" style={{ gap: space.md }}>
            <View style={styles.rowBetween}>
              <Text variant="label" tone="secondary">
                How severe?
              </Text>
              <Text variant="label" tone="brand">
                {SEVERITY_LABEL[severity]}
              </Text>
            </View>
            <View style={styles.severity}>
              {([1, 2, 3, 4, 5] as Severity[]).map((n) => {
                const on = n <= severity;
                const color = n >= 4 ? t.bad : n === 3 ? t.warn : t.good;
                return (
                  <Tap key={n} onPress={() => setSeverity(n)} haptic="selection" style={{ flex: 1 }} accessibilityLabel={SEVERITY_LABEL[n]}>
                    <Animated.View layout={LinearTransition} style={[styles.severityStep, { backgroundColor: on ? color : t.surface, height: 14 + n * 6 }]} />
                  </Tap>
                );
              })}
            </View>
          </Surface>

          <Surface kind="raised" style={{ gap: space.md }}>
            <Text variant="label" tone="secondary">
              Since when?
            </Text>
            <View style={styles.chips}>
              {DURATIONS.map((d) => (
                <Chip key={d.id} label={d.label} selected={duration === d.id} onPress={() => setDuration(d.id)} />
              ))}
            </View>
          </Surface>

          <Field label="Notes for later (optional)" placeholder="What they ate, where it hurts, anything unusual" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 70 }} />

          <Button label="Get guidance" onPress={evaluate} size="lg" icon="sparkle" />
        </Animated.View>
      ) : null}

      {step === 'result' && result ? (
        <Animated.View key="result" entering={FadeInUp.springify().damping(16)} style={{ gap: space.lg }}>
          <Verdict result={result} vetPhone={dog?.vet_phone ?? null} />

          {result.reasons.length ? (
            <Section title="Why">
              <Surface kind="raised" padding={0} style={{ overflow: 'hidden' }}>
                {result.reasons.map((r, i) => (
                  <View key={r} style={[styles.reason, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                    <Icon name="chevron" size={14} color={t.textTertiary} />
                    <Text variant="body" style={{ flex: 1 }}>
                      {r}
                    </Text>
                  </View>
                ))}
              </Surface>
            </Section>
          ) : null}

          {result.tips.length ? (
            <Section title="At home">
              {result.tips.map((tip) => (
                <Surface key={tip.label} kind="tonal" style={{ gap: space.xs }}>
                  <Text variant="headline">{tip.label}</Text>
                  <Text variant="body">{tip.homeTip}</Text>
                  <View style={styles.watch}>
                    <Icon name="warning" size={14} color={t.warn} />
                    <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                      Watch for: {tip.watchFor}
                    </Text>
                  </View>
                </Surface>
              ))}
            </Section>
          ) : null}

          <View style={{ gap: space.sm }}>
            <Button label={saved ? 'Logged to health record' : 'Log this to the health record'} icon={saved ? 'check' : 'plus'} onPress={save} loading={saving} disabled={saved} kind={saved ? 'secondary' : 'primary'} />
            <Button label="Check something else" kind="ghost" onPress={reset} />
          </View>
          <Text variant="caption" tone="tertiary" align="center">
            Guidance follows general veterinary triage principles. It is not a diagnosis. When in doubt, call your vet.
          </Text>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function Verdict({ result, vetPhone }: { result: TriageResult; vetPhone: string | null }) {
  const t = useTheme();
  const tone: Record<Triage, { bg: string; fg: string; icon: IconName; label: string }> = {
    green: { bg: t.good, fg: '#F4FBF5', icon: 'happy', label: 'Home care' },
    amber: { bg: t.warn, fg: '#FFF9EC', icon: 'warning', label: 'Vet within 24h' },
    red: { bg: t.bad, fg: '#FFF4EF', icon: 'emergency', label: 'Vet now' },
  };
  const v = tone[result.triage];
  return (
    <View style={[styles.verdict, { backgroundColor: v.bg }]}>
      <View style={styles.verdictHead}>
        <View style={[styles.verdictIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <Icon name={v.icon} size={26} color={v.fg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" style={{ color: v.fg, opacity: 0.85 }}>
            {v.label}
          </Text>
          <Text variant="title" style={{ color: v.fg }}>
            {result.title}
          </Text>
        </View>
      </View>
      <Text variant="body" style={{ color: v.fg }}>
        {result.guidance}
      </Text>
      {result.triage !== 'green' ? (
        <Tap onPress={() => Linking.openURL(vetPhone ? `tel:${vetPhone}` : 'https://www.google.com/maps/search/emergency+vet+near+me')} haptic="heavy" style={[styles.call, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
          <Icon name="vet" size={18} color={v.bg} />
          <Text variant="bodyStrong" style={{ color: v.bg }}>
            {vetPhone ? 'Call your vet' : 'Find an emergency vet'}
          </Text>
        </Tap>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  severity: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  severityStep: { borderRadius: 6 },
  verdict: { borderRadius: radius.xl, padding: space.xl, gap: space.md },
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  verdictIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 52, borderRadius: radius.pill },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  watch: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs + 2, marginTop: space.xs },
});
