import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = ViewProps & {
  /** raised = white-ish card with a warm shadow; tonal = oat fill, no shadow; outline = hairline only. */
  kind?: 'raised' | 'tonal' | 'outline' | 'brand' | 'fur';
  padding?: number;
  radiusSize?: keyof typeof radius;
};

export function Surface({ kind = 'raised', padding = space.lg, radiusSize = 'lg', style, ...rest }: Props) {
  const t = useTheme();
  const base = {
    raised: {
      backgroundColor: t.bgRaised,
      shadowColor: t.shadow,
      shadowOpacity: t.scheme === 'dark' ? 0.5 : 0.1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
      borderWidth: t.scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
      borderColor: t.border,
    },
    tonal: { backgroundColor: t.surface },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
    brand: { backgroundColor: t.brand },
    fur: { backgroundColor: t.furLight },
  }[kind];

  return <View {...rest} style={[base, { padding, borderRadius: radius[radiusSize] }, style]} />;
}
