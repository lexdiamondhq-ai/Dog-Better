import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type Appearance = 'system' | 'light' | 'dark';
export type WeightUnit = 'kg' | 'lb';

/** Only the two deliveries that exist. Each maps to local notifications scheduled from the calendar. */
export type NotificationPrefs = {
  /** Calendar items other than medication: meals, walks, vet visits, and the rest. */
  checkIn: boolean;
  /** Medication doses on the calendar. */
  medication: boolean;
};

export type Preferences = {
  appearance: Appearance;
  weightUnit: WeightUnit;
  notifications: NotificationPrefs;
};

const DEFAULTS: Preferences = {
  appearance: 'system',
  weightUnit: 'lb',
  notifications: { checkIn: true, medication: true },
};

const KEY = 'dogbetter.preferences.v1';

type Api = Preferences & {
  loaded: boolean;
  setAppearance: (a: Appearance) => void;
  setWeightUnit: (u: WeightUnit) => void;
  setNotification: (k: keyof NotificationPrefs, v: boolean) => void;
};

const Ctx = createContext<Api>({ ...DEFAULTS, loaded: false, setAppearance: () => {}, setWeightUnit: () => {}, setNotification: () => {} });

/** Device-local preferences. These are about this phone (theme, which pushes to allow), so they never sync. */
export function PreferencesProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Preferences> & { notifications?: Partial<NotificationPrefs> & Record<string, unknown> };
          // Older builds stored toggles for deliveries that never existed; only the two real ones survive.
          setPrefs({
            appearance: parsed.appearance ?? DEFAULTS.appearance,
            weightUnit: parsed.weightUnit ?? DEFAULTS.weightUnit,
            notifications: {
              checkIn: typeof parsed.notifications?.checkIn === 'boolean' ? parsed.notifications.checkIn : DEFAULTS.notifications.checkIn,
              medication: typeof parsed.notifications?.medication === 'boolean' ? parsed.notifications.medication : DEFAULTS.notifications.medication,
            },
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: Preferences) => {
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setAppearance = useCallback((appearance: Appearance) => persist({ ...prefs, appearance }), [prefs, persist]);
  const setWeightUnit = useCallback((weightUnit: WeightUnit) => persist({ ...prefs, weightUnit }), [prefs, persist]);
  const setNotification = useCallback((k: keyof NotificationPrefs, v: boolean) => persist({ ...prefs, notifications: { ...prefs.notifications, [k]: v } }), [prefs, persist]);

  const value = useMemo(() => ({ ...prefs, loaded, setAppearance, setWeightUnit, setNotification }), [prefs, loaded, setAppearance, setWeightUnit, setNotification]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences() {
  return useContext(Ctx);
}
