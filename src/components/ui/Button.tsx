import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  /** secondary is a brand wash, not gray. ghost is text only. accent is the one amber CTA on a screen. */
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, kind = 'primary', size = 'md', icon, loading, disabled, style }: Props) {
  const t = useTheme();
  const bg = {
    primary: t.brand,
    secondary: t.brandSoft,
    ghost: 'transparent',
    danger: t.bad,
    accent: t.accent,
  }[kind];
  const fg = {
    primary: t.onBrand,
    secondary: t.brand,
    ghost: t.brand,
    danger: t.onMeaning,
    accent: t.onAccent,
  }[kind];

  const height = { sm: 44, md: 48, lg: 58 }[size];
  const iconSize = { sm: 16, md: 18, lg: 20 }[size];
  const variant = size === 'lg' ? 'headline' : size === 'sm' ? 'label' : 'bodyStrong';

  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      haptic="medium"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, { backgroundColor: bg, height, borderRadius: radius.pill, paddingHorizontal: size === 'sm' ? space.lg : space.xl }, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
          <Text variant={variant} numberOfLines={1} style={{ color: fg }}>
            {label}
          </Text>
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
