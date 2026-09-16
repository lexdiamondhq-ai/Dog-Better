import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { themes, type Theme } from './tokens';
import { usePreferences } from '@/lib/preferences';

const ThemeContext = createContext<Theme>(themes.light);

/** System appearance by default; Settings can pin light or dark for this device. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const { appearance } = usePreferences();
  const scheme = appearance === 'system' ? system : appearance;
  const theme = scheme === 'dark' ? themes.dark : themes.light;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
