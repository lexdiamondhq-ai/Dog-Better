import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';

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

const WALK_IN_MS = 1800;
const AFTER_WALK = ['sit', 'bark', 'down'] as const;

type Props = {
  pose?: MascotPose;
  cycle?: boolean;
  size?: 'sm' | 'lg';
  labeled?: boolean;
};

/**
 * Cartoon pup, feet planted. Welcome walks in from the left on the ground.
 * No hop, no painted shadow. Later tricks stay on that same baseline.
 */
export function OnboardingMascot({ pose: locked, cycle = false, size = 'sm', labeled = false }: Props) {
  const walkOn = cycle && size === 'lg';
  const [arrived, setArrived] = useState(!walkOn);
  const [index, setIndex] = useState(0);
  const pose = walkOn && !arrived ? 'walk' : cycle ? AFTER_WALK[index % AFTER_WALK.length] : (locked ?? 'sit');
  const trick = TRICKS.find((t) => t.pose === pose) ?? TRICKS[1];
  const dim = SIZES[size];

  const enterX = useSharedValue(walkOn ? -Dimensions.get('window').width : 0);
  const scale = useSharedValue(1);
  const bark = useSharedValue(0);

  useEffect(() => {
    if (!walkOn) return;
    enterX.value = -Dimensions.get('window').width * 0.95;
    enterX.value = withTiming(0, { duration: WALK_IN_MS, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    const id = setTimeout(() => setArrived(true), WALK_IN_MS + 80);
    return () => clearTimeout(id);
  }, [walkOn, enterX]);

  useEffect(() => {
    if (!cycle || !arrived) return;
    const id = setInterval(() => setIndex((n) => n + 1), 2600);
    return () => clearInterval(id);
  }, [cycle, arrived]);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(bark);
    bark.value = 0;
    scale.value = 1;

    if (pose === 'sit') {
      scale.value = withRepeat(withSequence(withTiming(1.03, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1, false);
      return;
    }
    if (pose === 'bark') {
      bark.value = withRepeat(withSequence(withTiming(1, { duration: 120 }), withTiming(1, { duration: 420 }), withTiming(0, { duration: 160 }), withDelay(700, withTiming(0, { duration: 1 }))), -1);
      scale.value = withRepeat(withSequence(withTiming(1.02, { duration: 120 }), withTiming(1, { duration: 200 }), withDelay(880, withTiming(1, { duration: 1 }))), -1);
      return;
    }
    scale.value = withTiming(1, { duration: 220 });
  }, [pose, scale, bark]);

  const dogStyle = useAnimatedStyle(() => {
    const lift = ((scale.value - 1) * dim.img.height) / 2;
    return {
      transform: [{ translateX: enterX.value }, { translateY: -lift }, { scale: scale.value }],
    };
  });

  const barkStyle = useAnimatedStyle(() => ({
    opacity: bark.value,
    transform: [{ translateY: -6 * bark.value }, { scale: 0.85 + bark.value * 0.15 }],
  }));

  const body = (
    <View style={[styles.stage, dim.stage]}>
      <Animated.View style={[dim.dog, dogStyle]}>
        <Image source={POSES[pose]} style={[dim.img, styles.img]} contentFit="contain" />
      </Animated.View>
      {pose === 'bark' && arrived ? (
        <Animated.View style={[styles.arf, size === 'lg' && styles.arfLg, barkStyle]} pointerEvents="none">
          <Text variant={size === 'lg' ? 'headline' : 'label'}>arf</Text>
        </Animated.View>
      ) : null}
      {labeled ? (
        <View style={styles.label}>
          <Text variant="overline" tone="accent">
            {arrived ? trick.name : 'Here I come'}
          </Text>
          <Text variant="caption" tone="secondary">
            {arrived ? trick.note : 'Walking in'}
          </Text>
        </View>
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
    dog: { width: 168, height: 132, alignItems: 'center' as const, justifyContent: 'flex-end' as const },
    img: { width: 168, height: 132 },
  },
  lg: {
    stage: { height: 280, width: 320 },
    dog: { width: 280, height: 232, alignItems: 'center' as const, justifyContent: 'flex-end' as const },
    img: { width: 280, height: 232 },
  },
};

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  img: { backgroundColor: 'transparent' },
  arf: {
    position: 'absolute',
    right: 12,
    top: 4,
    backgroundColor: 'rgba(250,243,230,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  arfLg: { right: 0, top: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  label: { alignItems: 'center', marginTop: 8, gap: 2, minHeight: 36 },
});
