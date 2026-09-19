import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PlayingCard, cardHeightFor } from '@/components/learn/PlayingCard';
import { Button } from '@/components/ui/Button';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { dealPack, type PackCard } from '@/engine/packQuiz';
import { playChime } from '@/lib/chime';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function PackFlip({ seed, onDone }: { seed: string; onDone: (correct: number, total: number) => void }) {
  const t = useTheme();
  const { reduceMotion } = t;
  const [hand] = useState(() => dealPack(seed));
  const [i, setI] = useState(0);
  const [ask, setAsk] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [boardW, setBoardW] = useState(0);
  const card = hand[i];
  const flip = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bob, i, reduceMotion]);

  useEffect(() => {
    flip.value = withTiming(ask ? 180 : 0, { duration: reduceMotion ? 0 : 620, easing: Easing.bezier(0.2, 0.75, 0.2, 1) });
  }, [ask, flip, reduceMotion]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateY: `${interpolate(flip.value, [0, 180], [0, 180])}deg` }, { translateY: bob.value }],
    opacity: flip.value < 90 ? 1 : 0,
    zIndex: flip.value < 90 ? 3 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateY: `${interpolate(flip.value, [0, 180], [180, 360])}deg` }],
    opacity: flip.value > 90 ? 1 : 0,
    zIndex: flip.value > 90 ? 3 : 0,
  }));

  if (!card) return null;

  const width = boardW;
  const height = width ? cardHeightFor(width) : 0;
  const last = i >= hand.length - 1;
  const right = picked === card.answer;
  const pip = card.name.slice(0, 1).toUpperCase();

  const choose = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    if (choice === card.answer) {
      setCorrect((n) => n + 1);
      void playChime();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const next = () => {
    if (last) {
      onDone(correct, hand.length);
      return;
    }
    setI((n) => n + 1);
    setAsk(false);
    setPicked(null);
  };

  return (
    <View style={{ gap: space.md }} onLayout={(e) => setBoardW(e.nativeEvent.layout.width)}>
      <View style={styles.meta}>
        <Text variant="overline" tone="tertiary">
          {i + 1} / {hand.length}
        </Text>
        <Text variant="caption" tone="secondary">
          {correct} right
        </Text>
      </View>

      {width ? (
        <View style={[styles.stage, { height }]}>
          <Animated.View pointerEvents={ask ? 'none' : 'auto'} style={[styles.face, frontStyle]}>
            <PortraitFace card={card} pip={pip} width={width} height={height} onFlip={() => setAsk(true)} />
          </Animated.View>
          <Animated.View pointerEvents={ask ? 'auto' : 'none'} style={[styles.face, styles.back, backStyle]}>
            <AskFace card={card} pip={pip} width={width} height={height} picked={picked} onChoose={choose} />
          </Animated.View>
        </View>
      ) : (
        <View style={{ height: 420 }} />
      )}

      {!ask ? (
        <Text variant="caption" tone="tertiary" align="center">
          A playing card. Tap the portrait to flip.
        </Text>
      ) : null}

      {picked ? (
        <Animated.View
          entering={FadeInUp.duration(220)}
          style={[styles.verdict, { backgroundColor: right ? t.goodSoft : t.warnSoft, borderColor: right ? t.good : t.warn }]}
          accessibilityLiveRegion="polite">
          <Text variant="overline" tone={right ? 'good' : 'warn'}>
            {right ? 'Right' : 'The answer'}
          </Text>
          <Text variant="headline">{card.answer}</Text>
          <Text variant="body" tone="secondary">
            {card.story}
          </Text>
          <Button label={last ? 'We did it' : 'Next card'} icon={last ? 'check' : 'chevron'} onPress={next} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function PortraitFace({
  card,
  pip,
  width,
  height,
  onFlip,
}: {
  card: PackCard;
  pip: string;
  width: number;
  height: number;
  onFlip: () => void;
}) {
  const t = useTheme();
  return (
    <PlayingCard pip={pip} width={width} height={height}>
      <Tap
        onPress={onFlip}
        haptic="medium"
        style={styles.portraitHit}
        accessibilityRole="button"
        accessibilityLabel={`Playing card. ${card.name}. Tap to flip.`}>
        <View style={[styles.portraitWell, { backgroundColor: t.furLight }]}>
          <Image source={card.art} style={styles.portrait} contentFit="contain" />
        </View>
        <View style={[styles.banner, { backgroundColor: t.brand }]}>
          <Text variant="headline" style={{ color: t.onBrand }} numberOfLines={1}>
            {card.name}
          </Text>
        </View>
      </Tap>
    </PlayingCard>
  );
}

function AskFace({
  card,
  pip,
  width,
  height,
  picked,
  onChoose,
}: {
  card: PackCard;
  pip: string;
  width: number;
  height: number;
  picked: string | null;
  onChoose: (choice: string) => void;
}) {
  const t = useTheme();
  return (
    <PlayingCard pip={pip} width={width} height={height}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.ask}>
        <Text variant="overline" tone="tertiary" numberOfLines={1}>
          {card.name}
        </Text>
        <Text variant="bodyStrong">{card.question}</Text>
        <View style={styles.choices}>
          {card.choices.map((choice) => {
            const show = !!picked;
            const isAnswer = choice === card.answer;
            const isPick = choice === picked;
            const bg = !show ? t.surface : isAnswer ? t.goodSoft : isPick ? t.badSoft : t.surface;
            const ink = !show ? t.text : isAnswer ? t.goodDeep : isPick ? t.badDeep : t.textTertiary;
            const border = show && isAnswer ? t.good : show && isPick ? t.bad : t.border;
            return (
              <Tap
                key={choice}
                onPress={() => onChoose(choice)}
                haptic="selection"
                disabled={!!picked}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!picked, selected: isPick }}
                accessibilityLabel={show && isAnswer ? `${choice}. Correct answer.` : choice}
                style={[styles.choice, { backgroundColor: bg, borderColor: border }]}>
                <Text variant="label" style={{ color: ink }} numberOfLines={2}>
                  {choice}
                </Text>
              </Tap>
            );
          })}
        </View>
      </Animated.View>
    </PlayingCard>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stage: { width: '100%' },
  face: { position: 'absolute', left: 0, top: 0 },
  back: {},
  portraitHit: { flex: 1 },
  portraitWell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: space.xl, paddingHorizontal: space.sm },
  portrait: { width: '100%', height: '100%' },
  banner: {
    marginHorizontal: space.lg,
    marginBottom: space.xl,
    marginTop: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  ask: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.xl + space.sm, paddingBottom: space.lg, gap: space.sm, justifyContent: 'center' },
  choices: { gap: space.xs },
  choice: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  verdict: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
});
