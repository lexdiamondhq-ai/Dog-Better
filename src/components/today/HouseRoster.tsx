import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Dot = { icon: IconName; label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'neutral' };

export function HouseRoster({ dots }: { dots: Dot[] }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
      {dots.map((d, i) => {
        const color = { good: t.good, warn: t.warn, bad: t.bad, neutral: t.brand }[d.tone];
        return (
          <View key={d.label} style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.border }]}>
            <Icon name={d.icon} size={14} color={color} />
            <Text variant="caption" tone="secondary">
              {d.label}
            </Text>
            <Text variant="label" numberOfLines={1} style={{ color }}>
              {d.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cell: { flex: 1, paddingVertical: space.sm, paddingHorizontal: space.sm, gap: 2, alignItems: 'center' },
});
