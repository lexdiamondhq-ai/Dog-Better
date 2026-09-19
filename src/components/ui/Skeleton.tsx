import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Pulse block for first paint. Never show an empty-state as if it were the truth. */
export function Skeleton({ width = '100%', height = 16, circle, style }: Props) {
  const t = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    if (t.reduceMotion) {
      pulse.set(0.55);
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [pulse, t.reduceMotion]);

  const fade = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: circle ? height / 2 : radius.sm,
          backgroundColor: t.surfaceStrong,
        },
        fade,
        style,
      ]}
    />
  );
}

export function SkeletonRow({ lines = 2 }: { lines?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '68%' : '100%'} height={14} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
});
