/**
 * Dog Better design tokens.
 *
 * The palette starts from the mascot (cocoa wordmark, sandy fur, espresso ears, golden paw pad)
 * and pushes it richer: a deep espresso base, a saturated amber-gold accent, and jewel tones that
 * carry meaning. Forest green means good, terracotta means watch, garnet means urgent, lapis means
 * information. Meaning colours are never decorative.
 */

export const palette = {
  espresso: '#24160F',
  espressoDeep: '#140E0B',
  cocoa: '#5A3B27',
  cocoaDeep: '#3E2818',
  cocoaLight: '#7A5640',
  fur: '#E9C99A',
  furLight: '#F4E3C4',
  amber: '#F2A81D',
  amberDeep: '#C9840A',
  amberLight: '#FFD27A',
  paper: '#FAF3E6',
  oat: '#F1E5D2',
  linen: '#E6D5BB',
  sand: '#D4C0A0',
  forest: '#2F7D4F',
  forestDeep: '#1F5C38',
  forestLight: '#5BB57F',
  terracotta: '#D9722F',
  terracottaDeep: '#B2561C',
  terracottaLight: '#F0925A',
  garnet: '#B3273B',
  garnetDeep: '#8A1D2D',
  garnetLight: '#E4576B',
  lapis: '#2F5DA8',
  lapisLight: '#6D9BE0',
  night: '#140E0B',
  nightRaised: '#1F1611',
  nightSurface: '#2A1E17',
  nightStrong: '#382A20',
  white: '#FFFFFF',
} as const;

export type Scheme = 'light' | 'dark';

export const themes = {
  light: {
    scheme: 'light' as Scheme,
    bg: palette.paper,
    bgRaised: palette.white,
    surface: palette.oat,
    surfaceStrong: palette.linen,
    border: 'rgba(90, 59, 39, 0.12)',
    borderStrong: 'rgba(90, 59, 39, 0.26)',
    text: palette.espresso,
    textSecondary: 'rgba(36, 22, 15, 0.64)',
    textTertiary: 'rgba(36, 22, 15, 0.44)',
    onBrand: palette.paper,
    brand: palette.cocoa,
    brandDeep: palette.cocoaDeep,
    brandLight: palette.cocoaLight,
    accent: palette.amber,
    accentDeep: palette.amberDeep,
    onAccent: palette.espresso,
    fur: palette.fur,
    furLight: palette.furLight,
    good: palette.forest,
    goodDeep: palette.forestDeep,
    warn: palette.terracotta,
    warnDeep: palette.terracottaDeep,
    bad: palette.garnet,
    badDeep: palette.garnetDeep,
    info: palette.lapis,
    onMeaning: palette.white,
    glassTint: 'rgba(250, 243, 230, 0.70)',
    dockBg: 'rgba(250, 243, 230, 0.84)',
    shadow: palette.cocoaDeep,
    scrim: palette.espresso,
    /** Hero gradient, brand-deep to brand: used behind the login mascot and hero cards. */
    heroGradient: [palette.cocoaDeep, palette.cocoa] as readonly [string, string],
    accentGradient: [palette.amber, palette.amberDeep] as readonly [string, string],
  },
  dark: {
    scheme: 'dark' as Scheme,
    bg: palette.night,
    bgRaised: palette.nightRaised,
    surface: palette.nightSurface,
    surfaceStrong: palette.nightStrong,
    border: 'rgba(233, 201, 154, 0.10)',
    borderStrong: 'rgba(233, 201, 154, 0.24)',
    text: palette.furLight,
    textSecondary: 'rgba(244, 227, 196, 0.66)',
    textTertiary: 'rgba(244, 227, 196, 0.44)',
    onBrand: palette.night,
    brand: palette.fur,
    brandDeep: palette.furLight,
    brandLight: palette.sand,
    accent: palette.amber,
    accentDeep: palette.amberDeep,
    onAccent: palette.espresso,
    fur: palette.cocoa,
    furLight: palette.cocoaDeep,
    good: palette.forestLight,
    goodDeep: palette.forest,
    warn: palette.terracottaLight,
    warnDeep: palette.terracotta,
    bad: palette.garnetLight,
    badDeep: palette.garnet,
    info: palette.lapisLight,
    onMeaning: palette.night,
    glassTint: 'rgba(20, 14, 11, 0.64)',
    dockBg: 'rgba(31, 22, 17, 0.86)',
    shadow: '#000000',
    scrim: '#000000',
    heroGradient: [palette.espressoDeep, palette.cocoaDeep] as readonly [string, string],
    accentGradient: [palette.amberLight, palette.amber] as readonly [string, string],
  },
} as const;

export type Theme = (typeof themes)[Scheme];

/**
 * Aligned to iOS 26: larger continuous containers, smaller grouped lists, concentric inners.
 * Inner radius should be `concentric(outer, padding)`.
 */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 34,
  pill: 999,
} as const;

export function concentric(outer: number, inset: number) {
  return Math.max(radius.xs, outer - inset);
}

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;





export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
} as const;

export const springs = {
  snappy: { damping: 18, stiffness: 240, mass: 0.8 },
  soft: { damping: 20, stiffness: 140, mass: 1 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.9 },
} as const;
