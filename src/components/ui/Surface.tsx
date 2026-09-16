import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = ViewProps & {
  /**
   * grouped = iOS inset list (no shadow). raised = rare lifted card.
   * tonal / outline stay flat. brand / fur are meaning fills, not chrome.
   */
  kind?: 'grouped' | 'raised' | 'tonal' | 'outline' | 'brand' | 'fur';
  padding?: number;
  radiusSize?: keyof typeof radius;
};

export function Surface({ kind = 'grouped', padding = space.lg, radiusSize = 'lg', style, ...rest }: Props) {
  const t = useTheme();
  const base = {
    grouped: {
      backgroundColor: t.bgRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    raised: {
      backgroundColor: t.bgRaised,
      shadowColor: t.shadow,
      shadowOpacity: t.scheme === 'dark' ? 0.35 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    tonal: { backgroundColor: t.surface },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
    brand: { backgroundColor: t.brand },
    fur: { backgroundColor: t.furLight },
  }[kind];

  return <View {...rest} style={[base, { padding, borderRadius: radius[radiusSize] }, style]} />;
}

/** Records, settings, and timelines. Not a marshmallow. */
export function GroupedList({ children, style, ...rest }: ViewProps) {
  return (
    <Surface kind="grouped" padding={0} style={[{ overflow: 'hidden' }, style]} {...rest}>
      {children}
    </Surface>
  );
}
