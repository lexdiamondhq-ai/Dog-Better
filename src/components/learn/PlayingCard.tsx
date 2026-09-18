import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { concentric, radius, space } from '@/theme/tokens';

const RATIO = 63 / 88;

export function cardHeightFor(width: number) {
  return Math.round(width / RATIO);
}

/** Double-rail playing card: amber edge, cocoa inner, ivory plate. Tokens only. */
export function PlayingCard({
  children,
  width,
  height,
  pip,
}: {
  children: ReactNode;
  width: number;
  height: number;
  pip: string;
}) {
  const t = useTheme();
  const plate = concentric(radius.xl, 10);

  return (
    <LinearGradient
      colors={[t.accent, t.brand, t.accentDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.rail,
        {
          width,
          height,
          shadowColor: t.shadow,
        },
      ]}>
      <View style={[styles.inner, { backgroundColor: t.brandDeep, borderRadius: concentric(radius.xl, 5) }]}>
        <View style={[styles.plate, { backgroundColor: t.bgRaised, borderRadius: plate, borderColor: t.fur }]}>
          <View style={[styles.pip, styles.pipTl]} pointerEvents="none">
            <Text variant="overline" style={{ color: t.brand }}>
              {pip}
            </Text>
            <Icon name="paw" size={12} color={t.accent} />
          </View>
          <View style={[styles.pip, styles.pipBr]} pointerEvents="none">
            <Text variant="overline" style={{ color: t.brand }}>
              {pip}
            </Text>
            <Icon name="paw" size={12} color={t.accent} />
          </View>
          {children}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  rail: {
    borderRadius: radius.xl,
    padding: 3,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  inner: { flex: 1, padding: 4 },
  plate: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pip: { position: 'absolute', zIndex: 2, alignItems: 'center', gap: 2 },
  pipTl: { top: space.sm, left: space.sm },
  pipBr: { bottom: space.sm, right: space.sm, transform: [{ rotate: '180deg' }] },
});
