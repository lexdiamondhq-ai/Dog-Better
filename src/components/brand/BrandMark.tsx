import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Props = {
  tone?: 'default' | 'onBrand' | 'muted';
  align?: 'left' | 'center';
  line?: string;
};

/** Compact in-app lockup so the name shows up in places that are not the splash. */
export function BrandMark({ tone = 'default', align = 'left', line }: Props) {
  const t = useTheme();
  const color = tone === 'onBrand' ? t.onBrand : tone === 'muted' ? t.textTertiary : t.brand;
  return (
    <View style={[styles.wrap, align === 'center' && styles.center]}>
      <View style={styles.row}>
        <Icon name="paw" size={14} color={color} />
        <Text variant="overline" style={{ color }}>
          Dog Better
        </Text>
      </View>
      {line ? (
        <Text variant="caption" tone={tone === 'onBrand' ? undefined : 'secondary'} style={tone === 'onBrand' ? { color: t.onBrand, opacity: 0.8 } : undefined}>
          {line}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
