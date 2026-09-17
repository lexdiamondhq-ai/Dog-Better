import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';

export type MascotPose = 'walk' | 'bark' | 'sit' | 'down';

export const TRICKS: { pose: MascotPose; name: string; note: string }[] = [
  { pose: 'walk', name: 'Strut', note: 'A little walk-on' },
  { pose: 'bark', name: 'Speak', note: 'arf' },
  { pose: 'sit', name: 'Sit pretty', note: 'Ready for treats' },
  { pose: 'down', name: 'Flop', note: 'Good dog' },
];

const POSES: Record<MascotPose, number> = {
  walk: require('@/assets/brand/mascot-walking.png'),
  bark: require('@/assets/brand/mascot-bark.png'),
  sit: require('@/assets/brand/mascot.png'),
  down: require('@/assets/brand/mascot-down.png'),
};

const ease = Easing.inOut(Easing.quad);

type Props = {
  pose?: MascotPose;
  cycle?: boolean;
  size?: 'sm' | 'lg';
  labeled?: boolean;
};

/** Cartoon pup. Compact for dog setup. Large and cycling for the first-open welcome. */
export function OnboardingMascot({ pose: locked, cycle = false, size = 'sm', labeled = false }: Props) {
  const [index, setIndex] = useState(0);
  const pose = cycle ? TRICKS[index].pose : (locked ?? 'sit');
  const trick = TRICKS.find((t) => t.pose === pose) ?? TRICKS[2];

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(1);
  const bark = useSharedValue(0);

  useEffect(() => {
    if (!cycle) return;
    const id = setInterval(() => setIndex((n) => (n + 1) % TRICKS.length), 2800);
    return () => clearInterval(id);
  }, [cycle]);

  useEffect(() => {
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(rot);
    cancelAnimation(scale);
    cancelAnimation(bark);
    rot.value = withTiming(0, { duration: 220 });
    bark.value = 0;

    if (pose === 'walk') {
      x.value = withRepeat(withSequence(withTiming(size === 'lg' ? 36 : 22, { duration: 520, easing: ease }), withTiming(size === 'lg' ? -36 : -22, { duration: 520, easing: ease })), -1, true);
      y.value = withRepeat(withSequence(withTiming(-10, { duration: 180, easing: ease }), withTiming(0, { duration: 180, easing: ease })), -1);
      rot.value = withRepeat(withSequence(withTiming(-8, { duration: 260, easing: ease }), withTiming(8, { duration: 260, easing: ease })), -1, true);
      scale.value = withTiming(1, { duration: 200 });
      return;
    }

    if (pose === 'bark') {
      x.value = withTiming(0, { duration: 240 });
      y.value = withRepeat(withSequence(withTiming(-8, { duration: 110 }), withTiming(0, { duration: 110 }), withTiming(0, { duration: 820 })), -1);
      scale.value = withRepeat(withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 160 }), withTiming(1, { duration: 760 })), -1);
      bark.value = withRepeat(withSequence(withTiming(1, { duration: 140 }), withTiming(1, { duration: 360 }), withTiming(0, { duration: 180 }), withTiming(0, { duration: 620 })), -1);
      return;
    }

    if (pose === 'sit') {
      x.value = withTiming(0, { duration: 240 });
      y.value = withRepeat(withSequence(withTiming(-4, { duration: 900, easing: ease }), withTiming(0, { duration: 900, easing: ease })), -1, true);
      scale.value = withRepeat(withSequence(withTiming(1.05, { duration: 900, easing: ease }), withTiming(1, { duration: 900, easing: ease })), -1, true);
      return;
    }

    x.value = withTiming(0, { duration: 280 });
    y.value = withSpring(size === 'lg' ? 16 : 10, { damping: 14, stiffness: 90 });
    scale.value = withSpring(0.96, { damping: 14, stiffness: 90 });
  }, [pose, size, x, y, scale, bark, rot]);

  const dogStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));

  const barkStyle = useAnimatedStyle(() => ({
    opacity: bark.value,
    transform: [{ translateY: -8 * bark.value }, { scale: 0.7 + bark.value * 0.3 }],
  }));

  const dim = SIZES[size];

  const body = (
    <View style={[styles.stage, dim.stage]}>
      <Animated.View key={pose} entering={FadeIn.duration(220)} style={[dim.dog, dogStyle]}>
        <Image source={POSES[pose]} style={[dim.img, { backgroundColor: 'transparent' }]} contentFit="contain" />
      </Animated.View>
      {pose === 'bark' ? (
        <Animated.View style={[styles.arf, size === 'lg' && styles.arfLg, barkStyle]} pointerEvents="none">
          <Text variant={size === 'lg' ? 'headline' : 'label'}>arf</Text>
        </Animated.View>
      ) : null}
      {labeled ? (
        <View style={styles.label}>
          <Text variant="overline" tone="accent">
            {trick.name}
          </Text>
          <Text variant="caption" tone="secondary">
            {trick.note}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (!cycle) return body;
  return (
    <Tap onPress={() => setIndex((n) => (n + 1) % TRICKS.length)} haptic="selection" accessibilityLabel={`Next trick, now ${trick.name}`}>
      {body}
    </Tap>
  );
}

const SIZES = {
  sm: {
    stage: { height: 132 },
    dog: { width: 148, height: 118, alignItems: 'center' as const, justifyContent: 'flex-end' as const },
    img: { width: 148, height: 118 },
  },
  lg: {
    stage: { height: 248, width: 280 },
    dog: { width: 240, height: 190, alignItems: 'center' as const, justifyContent: 'flex-end' as const },
    img: { width: 240, height: 190 },
  },
};

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'flex-end' },
  arf: {
    position: 'absolute',
    right: 28,
    top: 8,
    backgroundColor: 'rgba(250,243,230,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  arfLg: { right: 8, top: 16, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  label: { alignItems: 'center', marginTop: 4, gap: 2 },
});
