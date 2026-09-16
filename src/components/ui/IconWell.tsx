import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { control } from '@/theme/tokens';

type Tone = 'brand' | 'accent' | 'good' | 'warn' | 'bad' | 'info' | 'solid';

type Props = {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

const DIMS = {
  sm: { box: control.sm, icon: 15, radius: 10 },
  md: { box: control.md, icon: 16, radius: 12 },
  lg: { box: control.lg, icon: 18, radius: 14 },
} as const;

/**
 * The tinted square behind a list-row icon. One size table, one tint table, so every
 * row across Today, Profile, Settings, and the aisle uses the same well.
 */
export function IconWell({ name, size = 'md', tone = 'brand', style }: Props) {
  const t = useTheme();
  const d = DIMS[size];
  const look = {
    brand: { bg: t.brandSoft, fg: t.brand },
    accent: { bg: t.accentSoft, fg: t.accentDeep },
    good: { bg: t.goodSoft, fg: t.goodDeep },
    warn: { bg: t.warnSoft, fg: t.warnDeep },
    bad: { bg: t.badSoft, fg: t.badDeep },
    info: { bg: t.infoSoft, fg: t.info },
    solid: { bg: t.brand, fg: t.onBrand },
  }[tone];

  return (
    <View style={[styles.well, { width: d.box, height: d.box, borderRadius: d.radius, backgroundColor: look.bg }, style]}>
      <Icon name={name} size={d.icon} color={look.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  well: { alignItems: 'center', justifyContent: 'center' },
});
