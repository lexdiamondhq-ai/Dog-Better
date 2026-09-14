import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
};

export function Chip({ label, selected, onPress, icon, tone = 'neutral' }: Props) {
  const t = useTheme();
  const toneColor = { neutral: t.brand, good: t.good, warn: t.warn, bad: t.bad }[tone];
  const bg = selected ? toneColor : t.surface;
  const fg = selected ? (tone === 'neutral' ? t.onBrand : '#FFFDF8') : t.text;

  const inner = (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: selected ? toneColor : t.border }]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return inner;
  return (
    <Tap onPress={onPress} haptic="selection" scaleTo={0.94} accessibilityRole="button" accessibilityState={{ selected }}>
      {inner}
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
