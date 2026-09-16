import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { pointsLabel } from '@/engine/rewards';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Small amber chip that tells the user what a tap is worth before they do it. */
export function EarnBadge({ points, onBrand = false }: { points: number; onBrand?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: onBrand ? `${t.onBrand}24` : t.accent }]}>
      <Text variant="micro" style={{ color: onBrand ? t.onBrand : t.onAccent }}>
        {pointsLabel(points)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space.sm,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
