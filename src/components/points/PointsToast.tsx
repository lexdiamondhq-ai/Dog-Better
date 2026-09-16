import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { REWARDS, pointsLabel } from '@/engine/rewards';
import { usePoints } from '@/lib/points';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function PointsToast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { lastAward, clearToast } = usePoints();

  useEffect(() => {
    if (!lastAward) return;
    const id = setTimeout(clearToast, 2400);
    return () => clearTimeout(id);
  }, [lastAward, clearToast]);

  if (!lastAward) return null;
  const spec = REWARDS[lastAward.kind];

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.toast, { backgroundColor: t.brand }]}>
        <Text variant="headline" style={{ color: t.accent }}>
          {pointsLabel(lastAward.points)}
        </Text>
        <Text variant="label" style={{ color: t.onBrand }}>
          {spec.label}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    height: 44,
    borderRadius: radius.pill,
  },
});
