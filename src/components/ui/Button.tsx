import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, kind = 'primary', size = 'md', icon, loading, disabled, style }: Props) {
  const t = useTheme();
  const bg = {
    primary: t.brand,
    secondary: t.surfaceStrong,
    ghost: 'transparent',
    danger: t.bad,
    accent: t.accent,
  }[kind];
  const fg = {
    primary: t.onBrand,
    secondary: t.text,
    ghost: t.brand,
    danger: t.onMeaning,
    accent: t.onAccent,
  }[kind];

  const height = size === 'lg' ? 58 : 48;

  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      haptic="medium"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, { backgroundColor: bg, height, borderRadius: radius.pill }, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} color={fg} /> : null}
          <Text variant={size === 'lg' ? 'headline' : 'bodyStrong'} style={{ color: fg }}>
            {label}
          </Text>
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
