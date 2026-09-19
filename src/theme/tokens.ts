/**
 * Dog Better design tokens.
 *
 * The palette starts from the mascot (cocoa wordmark, sandy fur, espresso ears, golden paw pad)
 * and pushes it richer: a deep espresso base, a saturated amber-gold accent, and jewel tones that
 * carry meaning. Forest green means good, terracotta means watch, garnet means urgent, lapis means
 * information. Meaning colours are never decorative.
 */

export const palette = {
  espresso: '#1E120C',
  espressoDeep: '#120B08',
  cocoa: '#4A2A17',
  cocoaDeep: '#31190C',
  cocoaLight: '#6E4A33',
  fur: '#E6C08C',
  furLight: '#F3E1C2',
  amber: '#F0A319',
  amberDeep: '#B87409',
  amberLight: '#FFD27A',
  /** Page base: warm ivory, a half step deeper than the old paper so raised cards lift. */
  paper: '#F6EEE2',
  /** Raised cards: warm white, never pure white, so they sit inside the ivory instead of on top of it. */
  ivory: '#FFFCF7',
  oat: '#EEE2CF',
  linen: '#E2D1B6',
  sand: '#CDB78F',
  forest: '#277A4B',
  forestDeep: '#1B5A36',
  forestLight: '#5DB983',
  terracotta: '#D3682A',
  terracottaDeep: '#A94F18',
  terracottaLight: '#F0925A',
  garnet: '#B0243A',
  garnetDeep: '#861B2B',
  garnetLight: '#E4576B',
  lapis: '#2C5BA6',
  lapisLight: '#6D9BE0',
  night: '#120C09',
  nightRaised: '#1D1410',
  nightSurface: '#281C15',
  nightStrong: '#36271E',
  white: '#FFFFFF',
} as const;

export type Scheme = 'light' | 'dark';

export const themes = {
  light: {
    scheme: 'light' as Scheme,
    bg: palette.paper,
    bgRaised: palette.ivory,
    surface: palette.oat,
    surfaceStrong: palette.linen,
    border: 'rgba(74, 42, 23, 0.14)',
    borderStrong: 'rgba(74, 42, 23, 0.28)',
    text: palette.espresso,
    textSecondary: 'rgba(30, 18, 12, 0.66)',
    textTertiary: 'rgba(30, 18, 12, 0.62)',
    onBrand: palette.ivory,
    brand: palette.cocoa,
    brandDeep: palette.cocoaDeep,
    brandLight: palette.cocoaLight,
    /** 8% brand wash. Icon wells, secondary buttons, selected rows. */
    brandSoft: 'rgba(74, 42, 23, 0.08)',
    accent: palette.amber,
    accentDeep: palette.amberDeep,
    accentSoft: 'rgba(240, 163, 25, 0.16)',
    onAccent: palette.espresso,
    fur: palette.fur,
    furLight: palette.furLight,
    good: palette.forest,
    goodDeep: palette.forestDeep,
    goodSoft: 'rgba(39, 122, 75, 0.12)',
    warn: palette.terracotta,
    warnDeep: palette.terracottaDeep,
    warnSoft: 'rgba(211, 104, 42, 0.14)',
    bad: palette.garnet,
    badDeep: palette.garnetDeep,
    badSoft: 'rgba(176, 36, 58, 0.12)',
    info: palette.lapis,
    infoSoft: 'rgba(44, 91, 166, 0.12)',
    onMeaning: palette.white,
    glassTint: 'rgba(246, 238, 226, 0.70)',
    dockBg: 'rgba(246, 238, 226, 0.84)',
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
    border: 'rgba(230, 192, 140, 0.12)',
    borderStrong: 'rgba(230, 192, 140, 0.26)',
    text: palette.furLight,
    textSecondary: 'rgba(243, 225, 194, 0.68)',
    textTertiary: 'rgba(243, 225, 194, 0.62)',
    onBrand: palette.espresso,
    brand: palette.amber,
    brandDeep: palette.amberLight,
    brandLight: palette.fur,
    brandSoft: 'rgba(240, 163, 25, 0.18)',
    accent: palette.amber,
    accentDeep: palette.amberLight,
    accentSoft: 'rgba(240, 163, 25, 0.18)',
    onAccent: palette.espresso,
    fur: palette.cocoa,
    furLight: palette.cocoaDeep,
    good: palette.forestLight,
    goodDeep: palette.forest,
    goodSoft: 'rgba(93, 185, 131, 0.16)',
    warn: palette.terracottaLight,
    warnDeep: palette.terracotta,
    warnSoft: 'rgba(240, 146, 90, 0.16)',
    bad: palette.garnetLight,
    badDeep: palette.garnet,
    badSoft: 'rgba(228, 87, 107, 0.16)',
    info: palette.lapisLight,
    infoSoft: 'rgba(109, 155, 224, 0.16)',
    onMeaning: palette.night,
    glassTint: 'rgba(18, 12, 9, 0.64)',
    dockBg: 'rgba(29, 20, 16, 0.86)',
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

/**
 * Control metrics. Every tappable that is not a full-width button picks one of these,
 * so pills, icon wells, and round buttons line up across screens instead of drifting by 2px.
 */
export const control = {
  /** Inline tag, count badge. */
  xs: 24,
  /** Pill chip, small icon well. Visual 36, Tap hitSlop brings it to 44. */
  sm: 36,
  /** Standard icon well, avatar chip, icon button. Apple 44pt minimum. */
  md: 44,
  /** Round icon button in a header. */
  lg: 44,
  /** Primary round action. */
  xl: 48,
} as const;

/** Default extra press area so 36pt chips still meet 44pt. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

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
