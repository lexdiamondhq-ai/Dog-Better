import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Props = ViewProps & {
  intensity?: number;
  /** Rounded corners must be applied here so the blur clips correctly. */
  borderRadius?: number;
  interactive?: boolean;
};

const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Real Liquid Glass on iOS 26+, a tinted blur elsewhere. Only over a photo, map, or camera.
 */
export function Glass({ children, style, intensity = 40, borderRadius = 0, interactive, ...rest }: Props) {
  const t = useTheme();

  if (liquid) {
    return (
      <GlassView
        {...rest}
        isInteractive={interactive}
        glassEffectStyle="regular"
        tintColor={t.glassTint}
        style={[{ borderRadius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View {...rest} style={[{ borderRadius, overflow: 'hidden' }, style]}>
      <BlurView
        intensity={intensity}
        tint={t.scheme === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.glassTint }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius, borderWidth: StyleSheet.hairlineWidth, borderColor: t.borderStrong }]} />
      {children}
    </View>
  );
}
