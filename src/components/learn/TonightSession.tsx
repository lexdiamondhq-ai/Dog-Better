import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { PackFlip } from '@/components/learn/PackFlip';
import { EarnBadge } from '@/components/points/EarnBadge';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { REWARDS } from '@/engine/rewards';
import type { Session } from '@/engine/guidance';
import { useDogs } from '@/lib/dogs';
import { usePoints } from '@/lib/points';
import { space } from '@/theme/tokens';

type Phase = 'ready' | 'play' | 'done';

export function TonightSession({ session, footer }: { session: Session; footer?: ReactNode }) {
  const { dog } = useDogs();
  const { award } = usePoints();
  type Run = { id: string; phase: Phase; paid: boolean; correct: number; total: number; deal: number };
  const fresh = (id: string): Run => ({ id, phase: 'ready', paid: false, correct: 0, total: 5, deal: 0 });
  const [run, setRun] = useState<Run>(() => fresh(session.id));
  const current = run.id === session.id ? run : fresh(session.id);
  const { phase, paid, correct, total, deal } = current;
  const patch = (fn: (prev: Run) => Partial<Run>) =>
    setRun((prev) => {
      const base = prev.id === session.id ? prev : fresh(session.id);
      return { ...base, ...fn(base) };
    });

  const finish = async (score: number, hand: number) => {
    const got = await award({ kind: 'tip', key: `session:${session.id}`, dogId: dog?.id });
    patch(() => ({ paid: !!got, correct: score, total: hand, phase: 'done' }));
  };

  return (
    <Surface kind="grouped" radiusSize="xl" style={{ gap: space.md }}>
      <Text variant="overline" tone="tertiary">
        Flip the pack · 5 cards
      </Text>
      <Text variant="title">Meet a friend. Flip for their history.</Text>

      {phase === 'ready' ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.md }}>
          <Text variant="body" tone="secondary">
            Five cartoon dogs. Flip each one, answer one true thing about how their breed came to be. Finish the hand and a treat lands in the jar.
          </Text>
          <Button label="Start the session" icon="play" size="lg" onPress={() => patch((p) => ({ phase: 'play', deal: p.deal + 1 }))} />
        </Animated.View>
      ) : null}

      {phase === 'play' ? (
        <Animated.View entering={FadeInUp.duration(220)} style={{ marginHorizontal: -space.sm }}>
          <PackFlip key={`${session.id}:${deal}`} seed={`${session.id}:${deal}`} onDone={(score, hand) => void finish(score, hand)} />
        </Animated.View>
      ) : null}

      {phase === 'done' ? (
        <Animated.View entering={FadeInUp.duration(240)} style={{ gap: space.md }}>
          <Text variant="headline">
            {correct} of {total}
            {dog?.name ? ` · ${dog.name} would have notes` : ''}
          </Text>
          <Text variant="body" tone="secondary">
            {paid
              ? `The pack is back in the box. ${REWARDS.tip.points} in the jar for finishing.`
              : 'Already in the jar for today. Another hand is still good practice.'}
          </Text>
          {paid ? <EarnBadge points={REWARDS.tip.points} /> : null}
          <View style={styles.row}>
            <Button label="Deal again" kind="secondary" onPress={() => patch((p) => ({ phase: 'play', deal: p.deal + 1, correct: 0 }))} />
          </View>
          {footer}
        </Animated.View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
});
