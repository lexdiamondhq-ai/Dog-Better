import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { themes, type Theme } from './tokens';
import { usePreferences } from '@/lib/preferences';

export type AppTheme = Theme & { reduceMotion: boolean };

const ThemeContext = createContext<AppTheme>({ ...themes.light, reduceMotion: false });

/** System appearance by default; Settings can pin light or dark for this device. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const { appearance } = usePreferences();
  const reduceMotion = useReducedMotion();
  const scheme = appearance === 'system' ? system : appearance;
  const theme = scheme === 'dark' ? themes.dark : themes.light;
  return <ThemeContext.Provider value={{ ...theme, reduceMotion }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
