import { PixelRatio, Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type TextVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'clinical'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'micro'
  | 'overline';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'onBrand' | 'good' | 'bad' | 'warn' | 'accent';

type Spec = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: TextStyle['textTransform'];
};

const VARIANTS: Record<TextVariant, Spec> = {
  hero: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 48, letterSpacing: -0.5 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.2 },
  clinical: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 18, letterSpacing: 1.1, textTransform: 'uppercase' },
};

const MAX_SCALE: Record<TextVariant, number> = {
  hero: 1.15,
  display: 1.2,
  title: 1.25,
  clinical: 1.25,
  headline: 1.35,
  body: 1.4,
  bodyStrong: 1.4,
  label: 1.4,
  caption: 1.4,
  micro: 1.4,
  overline: 1.35,
};

type Props = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'primary', align, style, ...rest }: Props) {
  const t = useTheme();
  const spec = VARIANTS[variant];
  const cap = MAX_SCALE[variant];
  const applied = Math.min(PixelRatio.getFontScale(), cap);
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

  if (__DEV__ && tone === 'tertiary' && spec.fontSize < 13) {
    console.warn(`Text tertiary on ${variant} (${spec.fontSize}px) fails WCAG AA.`);
  }

  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? cap}
      style={[
        {
          fontFamily: spec.fontFamily,
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight * applied,
          letterSpacing: spec.letterSpacing,
          textTransform: spec.textTransform,
        },
        { color, textAlign: align },
        style,
      ]}
    />
  );
}
