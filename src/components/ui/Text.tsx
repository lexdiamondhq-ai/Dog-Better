import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type TextVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'micro'
  | 'overline';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'onBrand' | 'good' | 'bad' | 'warn' | 'accent';

type Props = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'primary', align, style, ...rest }: Props) {
  const t = useTheme();
  const color = {
    primary: t.text,
    secondary: t.textSecondary,
    tertiary: t.textTertiary,
    brand: t.brand,
    onBrand: t.onBrand,
    good: t.goodDeep,
    bad: t.badDeep,
    warn: t.warn,
    accent: t.accentDeep,
  }[tone];

  return <RNText {...rest} style={[styles[variant], { color, textAlign: align }, style]} />;
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 48, letterSpacing: -0.5 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fonts.bodySemi, fontSize: 10, lineHeight: 12 },
  overline: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
});
