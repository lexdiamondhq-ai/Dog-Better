import * as Haptics from 'expo-haptics';
import { type PropsWithChildren } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SLOP, springs } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle>;
    /** How far the element shrinks while pressed. */
    scaleTo?: number;
    haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  }
>;

/**
 * The one pressable everything is built on: a soft spring squash plus a tiny haptic.
 * Reduce Motion swaps the scale for a fade. Every tap inherits a 44pt-friendly hit slop.
 */
export function Tap({ children, style, scaleTo = 0.965, haptic = 'light', onPressIn, onPressOut, onPress, disabled, accessibilityRole, hitSlop, ...rest }: Props) {
  const { reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <AnimatedPressable
      {...rest}
      hitSlop={hitSlop ?? HIT_SLOP}
      accessibilityRole={accessibilityRole ?? 'button'}
      disabled={disabled}
      onPressIn={(e) => {
        if (reduceMotion) opacity.set(withTiming(0.72, { duration: 80 }));
        else scale.set(withSpring(scaleTo, springs.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (reduceMotion) opacity.set(withTiming(1, { duration: 120 }));
        else scale.set(withSpring(1, springs.snappy));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic === 'selection') Haptics.selectionAsync();
        else if (haptic !== 'none') {
          const map = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
          } as const;
          Haptics.impactAsync(map[haptic]);
        }
        onPress?.(e);
      }}
      style={[animated, disabled && { opacity: 0.5 }, style]}>
      {children}
    </AnimatedPressable>
  );
}
