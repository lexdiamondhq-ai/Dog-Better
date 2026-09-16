import { Image } from 'expo-image';
import { useEffect } from 'react';
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

import { Text } from '@/components/ui/Text';

export type MascotPose = 'walk' | 'bark' | 'sit' | 'down';

const POSES: Record<MascotPose, number> = {
  walk: require('@/assets/brand/mascot-walking.png'),
  bark: require('@/assets/brand/mascot-bark.png'),
  sit: require('@/assets/brand/mascot.png'),
  down: require('@/assets/brand/mascot-down.png'),
};

const ease = Easing.inOut(Easing.quad);

/** Brand pup cycles walk, bark, sit, and down so onboarding feels like a dog, not a form. */
export function OnboardingMascot({ pose }: { pose: MascotPose }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(1);
  const bark = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(rot);
    cancelAnimation(scale);
    cancelAnimation(bark);
    rot.value = withTiming(0, { duration: 220 });
    bark.value = 0;

    if (pose === 'walk') {
      x.value = withRepeat(withSequence(withTiming(22, { duration: 520, easing: ease }), withTiming(-22, { duration: 520, easing: ease })), -1, true);
      y.value = withRepeat(withSequence(withTiming(-10, { duration: 180, easing: ease }), withTiming(0, { duration: 180, easing: ease })), -1);
      rot.value = withRepeat(withSequence(withTiming(-8, { duration: 260, easing: ease }), withTiming(8, { duration: 260, easing: ease })), -1, true);
      scale.value = withTiming(1, { duration: 200 });
      return;
    }

    if (pose === 'bark') {
      x.value = withTiming(0, { duration: 240 });
      y.value = withRepeat(
        withSequence(withTiming(-6, { duration: 110 }), withTiming(0, { duration: 110 }), withTiming(0, { duration: 820 })),
        -1,
      );
      scale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 120 }), withTiming(1, { duration: 160 }), withTiming(1, { duration: 760 })),
        -1,
      );
      bark.value = withRepeat(
        withSequence(withTiming(1, { duration: 140 }), withTiming(1, { duration: 360 }), withTiming(0, { duration: 180 }), withTiming(0, { duration: 620 })),
        -1,
      );
      return;
    }

    if (pose === 'sit') {
      x.value = withTiming(0, { duration: 240 });
      y.value = withRepeat(withSequence(withTiming(-4, { duration: 900, easing: ease }), withTiming(0, { duration: 900, easing: ease })), -1, true);
      scale.value = withRepeat(withSequence(withTiming(1.04, { duration: 900, easing: ease }), withTiming(1, { duration: 900, easing: ease })), -1, true);
      return;
    }

    x.value = withTiming(0, { duration: 280 });
    y.value = withSpring(10, { damping: 14, stiffness: 90 });
    scale.value = withSpring(0.96, { damping: 14, stiffness: 90 });
  }, [pose]);

  const dogStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));

  const barkStyle = useAnimatedStyle(() => ({
    opacity: bark.value,
    transform: [{ translateY: -8 * bark.value }, { scale: 0.7 + bark.value * 0.3 }],
  }));

  return (
    <View style={styles.stage}>
      <Animated.View key={pose} entering={FadeIn.duration(220)} style={[styles.dog, dogStyle]}>
        <Image source={POSES[pose]} style={styles.img} contentFit="contain" />
      </Animated.View>
      {pose === 'bark' ? (
        <Animated.View style={[styles.arf, barkStyle]} pointerEvents="none">
          <Text variant="label">arf</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 132, alignItems: 'center', justifyContent: 'flex-end' },
  dog: { width: 148, height: 118, alignItems: 'center', justifyContent: 'flex-end' },
  img: { width: 148, height: 118, backgroundColor: 'transparent' },
  arf: {
    position: 'absolute',
    right: 28,
    top: 8,
    backgroundColor: 'rgba(250,243,230,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
