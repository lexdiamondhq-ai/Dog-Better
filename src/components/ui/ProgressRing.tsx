import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useDerivedValue, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0..1, either a static value (animated in on change) or a live shared value driven by the caller. */
  progress: number | SharedValue<number>;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  delay?: number;
  children?: React.ReactNode;
};

export function ProgressRing({ progress, size = 120, stroke = 12, color, trackColor, delay = 0, children }: Props) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const internal = useSharedValue(0);
  const isShared = typeof progress !== 'number';
  const staticProgress = typeof progress === 'number' ? progress : 0;

  useEffect(() => {
    if (isShared) return;
    internal.value = withDelay(delay, withTiming(Math.max(0, Math.min(1, staticProgress)), { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [staticProgress, delay, internal, isShared]);

  const source = useDerivedValue(() => (isShared ? (progress as SharedValue<number>).value : internal.value));
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, source.value))) }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? t.surfaceStrong} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? t.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
