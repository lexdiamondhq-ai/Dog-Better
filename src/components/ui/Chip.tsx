import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { control, radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent';
  /** sm is an inline tag inside a card; md is a filter or switcher pill. */
  size?: 'sm' | 'md';
};

/**
 * One pill for filters, switchers, and inline tags. Unselected sits on a raised warm-white
 * so it reads as a control, not a label. Selected fills with the tone. Tone pills that are
 * not selected use the tone's soft wash so meaning still shows at a glance.
 */
export function Chip({ label, selected, onPress, icon, tone = 'neutral', size = 'md' }: Props) {
  const t = useTheme();
  const fill = { neutral: t.brand, good: t.good, warn: t.warn, bad: t.bad, accent: t.accent }[tone];
  const soft = { neutral: t.bgRaised, good: t.goodSoft, warn: t.warnSoft, bad: t.badSoft, accent: t.accentSoft }[tone];
  const softFg = { neutral: t.text, good: t.goodDeep, warn: t.warnDeep, bad: t.badDeep, accent: t.accentDeep }[tone];
  const onFill = tone === 'neutral' ? t.onBrand : tone === 'accent' ? t.onAccent : t.onMeaning;

  const bg = selected ? fill : soft;
  const fg = selected ? onFill : softFg;
  const border = selected ? fill : tone === 'neutral' ? t.border : 'transparent';
  const height = size === 'sm' ? control.sm - 4 : control.md;

  const inner = (
    <View style={[styles.chip, { height, backgroundColor: bg, borderColor: border, paddingHorizontal: size === 'sm' ? space.sm + 2 : space.md + 2 }]}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 14} color={fg} /> : null}
      <Text variant={size === 'sm' ? 'micro' : 'label'} numberOfLines={1} style={{ color: fg }}>
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
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
