import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { EarnBadge } from '@/components/points/EarnBadge';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { REWARDS } from '@/engine/rewards';
import type { Session } from '@/engine/guidance';
import { useDogs } from '@/lib/dogs';
import { usePoints } from '@/lib/points';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const LIMIT = 5 * 60;

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'ready' | 'play' | 'done';

export function TonightSession({ session, footer }: { session: Session; footer?: ReactNode }) {
  const t = useTheme();
  const { dog } = useDogs();
  const { award } = usePoints();
  const [phase, setPhase] = useState<Phase>('ready');
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(LIMIT);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setPhase('ready');
    setStep(0);
    setLeft(LIMIT);
    setPaid(false);
  }, [session.id]);

  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const last = step >= session.steps.length - 1;
  const fill = phase === 'ready' ? 0 : phase === 'done' ? 1 : Math.max((step + 1) / session.steps.length, (LIMIT - left) / LIMIT);

  const finish = async () => {
    const got = await award({ kind: 'tip', key: `session:${session.id}`, dogId: dog?.id });
    setPaid(!!got);
    setPhase('done');
  };

  return (
    <Surface kind="grouped" radiusSize="xl" style={{ gap: space.md }}>
      <Text variant="overline" tone="tertiary">
        Tonight · 5 minutes · {session.steps.length} steps
      </Text>
      <Text variant="title">{session.title}</Text>

      {phase === 'ready' ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.md }}>
          <Text variant="body" tone="secondary">
            {session.why} One step at a time. Timer runs while you work.
          </Text>
          <Button label="Start the session" icon="play" size="lg" onPress={() => setPhase('play')} />
        </Animated.View>
      ) : null}

      {phase === 'play' ? (
        <Animated.View entering={FadeInUp.duration(220)} style={{ gap: space.md }}>
          <View style={styles.timerRow}>
            <Text variant="display" style={{ color: left === 0 ? t.warn : t.text }}>
              {clock(left)}
            </Text>
            <Text variant="caption" tone="tertiary">
              Step {step + 1} of {session.steps.length}
              {left === 0 ? ' · time is up, finish the last step' : ''}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: t.surface }]}>
            <View style={[styles.fill, { width: `${Math.round(fill * 100)}%`, backgroundColor: t.brand }]} />
          </View>
          <View style={styles.dots}>
            {session.steps.map((_, i) => (
              <View key={i} style={[styles.pip, { backgroundColor: i <= step ? t.brand : t.surfaceStrong }]} />
            ))}
          </View>
          <Text variant="headline">{session.steps[step]}</Text>
          <View style={styles.row}>
            {step > 0 ? <Button label="Back" kind="secondary" onPress={() => setStep((n) => n - 1)} /> : null}
            {last ? (
              <View style={[styles.row, { flex: 1 }]}>
                <Button label="We did it" icon="check" style={{ flex: 1 }} onPress={finish} />
                <EarnBadge points={REWARDS.tip.points} />
              </View>
            ) : (
              <Button label="Next step" icon="chevron" style={{ flex: 1 }} onPress={() => setStep((n) => n + 1)} />
            )}
          </View>
        </Animated.View>
      ) : null}

      {phase === 'done' ? (
        <Animated.View entering={FadeInUp.duration(240)} style={{ gap: space.md }}>
          <Text variant="headline">We did it{dog?.name ? ` with ${dog.name}` : ''}</Text>
          <Text variant="body" tone="secondary">
            {paid
              ? `Treats are in the jar. ${REWARDS.tip.points} for finishing tonight.`
              : 'Already in the jar for today. Same session still counts as practice.'}
          </Text>
          {paid ? <EarnBadge points={REWARDS.tip.points} /> : null}
          <Button
            label="Run it again"
            kind="secondary"
            onPress={() => {
              setStep(0);
              setLeft(LIMIT);
              setPhase('play');
            }}
          />
          {footer}
        </Animated.View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  timerRow: { gap: 4 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  dots: { flexDirection: 'row', gap: 6 },
  pip: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
});
