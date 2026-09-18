import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CartoonWalk } from '@/components/brand/CartoonWalk';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { fonts, palette } from '@/theme/tokens';

export type MascotPose = 'walk' | 'bark' | 'sit' | 'down';

export const TRICKS: { pose: MascotPose; name: string; note: string }[] = [
  { pose: 'walk', name: 'Here I come', note: 'Walking in' },
  { pose: 'sit', name: 'Sit pretty', note: 'Ready for treats' },
  { pose: 'bark', name: 'Speak', note: 'arf' },
  { pose: 'down', name: 'Flop', note: 'Good dog' },
];

const POSES: Record<MascotPose, number> = {
  walk: require('@/assets/brand/mascot-walking.png'),
  bark: require('@/assets/brand/mascot-bark.png'),
  sit: require('@/assets/brand/mascot.png'),
  down: require('@/assets/brand/mascot-down.png'),
};

export const WALK_IN_MS = 2200;
const CROSSFADE_MS = 280;
const AFTER_WALK = ['sit', 'bark', 'down'] as const;
const START_X = -(Math.max(Dimensions.get('window').width, 400) + 40);

type Props = {
  pose?: MascotPose;
  cycle?: boolean;
  size?: 'sm' | 'lg';
  labeled?: boolean;
};

/**
 * Welcome walk is a continuous 60fps stride, not a flipbook. After he plants,
 * the original sticker poses take over for sit / speak / flop.
 */
export function OnboardingMascot({ pose: locked, cycle = false, size = 'sm', labeled = false }: Props) {
  const walkOn = cycle && size === 'lg';
  const [arrived, setArrived] = useState(!walkOn);
  const [index, setIndex] = useState(0);
  const pose = walkOn && !arrived ? 'walk' : cycle ? AFTER_WALK[index % AFTER_WALK.length] : (locked ?? 'sit');
  const trick = TRICKS.find((t) => t.pose === pose) ?? TRICKS[1];
  const dim = SIZES[size];
  const walking = pose === 'walk' && walkOn && !arrived;

  const enterX = useSharedValue(walkOn ? START_X : 0);
  const gait = useSharedValue(0);
  const bark = useSharedValue(0);

  useEffect(() => {
    if (!walkOn) return;
    enterX.value = START_X;
    gait.value = 0;
    enterX.value = withTiming(0, { duration: WALK_IN_MS, easing: Easing.bezier(0.22, 0.61, 0.36, 1) });
    gait.value = withTiming(1, { duration: WALK_IN_MS, easing: Easing.linear });
    const id = setTimeout(() => setArrived(true), WALK_IN_MS);
    return () => clearTimeout(id);
  }, [walkOn, enterX, gait]);

  useEffect(() => {
    if (!cycle || !arrived) return;
    const id = setInterval(() => setIndex((n) => n + 1), 2800);
    return () => clearInterval(id);
  }, [cycle, arrived]);

  useEffect(() => {
    cancelAnimation(bark);
    bark.value = 0;
    if (pose !== 'bark') return;
    bark.value = withRepeat(
      withSequence(withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 520 }), withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }), withDelay(780, withTiming(0, { duration: 1 }))),
      -1,
    );
  }, [pose, bark]);

  const dogStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enterX.value }],
  }));

  const barkStyle = useAnimatedStyle(() => ({
    opacity: bark.value,
    transform: [{ translateY: -4 * bark.value }, { scale: 0.92 + bark.value * 0.08 }],
  }));

  const body = (
    <View style={[styles.stage, dim.stage]}>
      <Animated.View style={[dim.dog, dogStyle]}>
        {walking ? (
          <CartoonWalk gait={gait} width={dim.img.width} height={dim.img.height} />
        ) : (
          <Animated.View
            key={pose}
            entering={FadeIn.duration(CROSSFADE_MS)}
            exiting={FadeOut.duration(CROSSFADE_MS * 0.7)}
            style={[StyleSheet.absoluteFill, styles.pose]}>
            <Image source={POSES[pose]} style={dim.img} contentFit="contain" recyclingKey={`mascot-${pose}-v9`} />
          </Animated.View>
        )}
      </Animated.View>
      {pose === 'bark' && arrived ? (
        <Animated.View style={[styles.arf, size === 'lg' && styles.arfLg, barkStyle]} pointerEvents="none">
          <Text variant={size === 'lg' ? 'headline' : 'label'} style={styles.arfText}>
            arf
          </Text>
        </Animated.View>
      ) : null}
      {labeled ? (
        <Animated.View key={arrived ? trick.name : 'walk'} entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)} style={styles.label}>
          <Text variant="overline" tone="accent">
            {arrived ? trick.name : 'Here I come'}
          </Text>
          <Text variant="caption" tone="secondary">
            {arrived ? trick.note : 'Walking in'}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );

  if (!cycle) return body;
  return (
    <Tap onPress={() => arrived && setIndex((n) => n + 1)} haptic="selection" accessibilityLabel={`Next trick, now ${trick.name}`}>
      {body}
    </Tap>
  );
}

const SIZES = {
  sm: {
    stage: { height: 148, width: 168 },
    dog: { width: 168, height: 132 },
    img: { width: 168, height: 132 },
  },
  lg: {
    stage: { height: 300, width: 360 },
    dog: { width: 312, height: 252 },
    img: { width: 312, height: 252 },
  },
};

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  pose: { alignItems: 'center', justifyContent: 'flex-end' },
  arf: {
    position: 'absolute',
    right: 8,
    top: 2,
    backgroundColor: palette.ivory,
    borderColor: palette.amberDeep,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  arfLg: { right: -4, top: 6, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18 },
  arfText: { color: palette.espresso, fontFamily: fonts.bodyHeavy },
  label: { alignItems: 'center', marginTop: 10, gap: 2, minHeight: 36 },
});
