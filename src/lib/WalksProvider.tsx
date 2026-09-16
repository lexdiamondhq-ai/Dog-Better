import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { metresBetween, type LiveWalk, type WalkPoint } from './walks';

type StartOpts = { placeName?: string };

type WalksContextValue = {
  walk: LiveWalk | null;
  start: (opts?: StartOpts) => Promise<void>;
  stop: () => LiveWalk | null;
};

const WalksContext = createContext<WalksContextValue | null>(null);

export function WalksProvider({ children }: { children: ReactNode }) {
  const [walk, setWalk] = useState<LiveWalk | null>(null);
  const walkRef = useRef<LiveWalk | null>(null);
  const stepsSub = useRef<{ remove: () => void } | null>(null);
  const locSub = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    walkRef.current = walk;
  }, [walk]);

  const pushPoint = useCallback((point: WalkPoint) => {
    setWalk((w) => {
      if (!w) return w;
      const last = w.path[w.path.length - 1];
      if (last && metresBetween(last, point) < 8) return { ...w, here: point };
      return { ...w, here: point, path: [...w.path, point] };
    });
  }, []);

  const attachWatchers = useCallback(async () => {
    stepsSub.current?.remove();
    locSub.current?.remove();

    try {
      const ok = await Pedometer.isAvailableAsync().catch(() => false);
      if (ok) {
        const motion = await Pedometer.requestPermissionsAsync().catch(() => null);
        if (!motion || motion.granted) {
          stepsSub.current = Pedometer.watchStepCount((r) => setWalk((w) => (w ? { ...w, steps: r.steps } : w)));
        }
      }
    } catch {
      /* Simulator and some Androids have no pedometer. The timer still runs. */
    }

    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      setWalk((w) => (w ? { ...w, locationDenied: true } : w));
      return;
    }
    try {
      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      pushPoint({ latitude: first.coords.latitude, longitude: first.coords.longitude });
      locSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 3000 },
        (loc) => pushPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
      );
    } catch {
      setWalk((w) => (w ? { ...w, locationDenied: true } : w));
    }
  }, [pushPoint]);

  const start = useCallback(
    async (opts?: StartOpts) => {
      const current = walkRef.current;
      if (current) {
        if (opts?.placeName) setWalk((w) => (w ? { ...w, placeName: opts.placeName } : w));
        return;
      }
      const next = { startedAt: new Date(), steps: 0, path: [], here: null, locationDenied: false, placeName: opts?.placeName };
      walkRef.current = next;
      setWalk(next);
      void attachWatchers();
    },
    [attachWatchers],
  );

  const stop = useCallback(() => {
    stepsSub.current?.remove();
    locSub.current?.remove();
    stepsSub.current = null;
    locSub.current = null;
    const finished = walkRef.current;
    setWalk(null);
    return finished;
  }, []);

  useEffect(
    () => () => {
      stepsSub.current?.remove();
      locSub.current?.remove();
    },
    [],
  );

  const value = useMemo(() => ({ walk, start, stop }), [walk, start, stop]);
  return <WalksContext.Provider value={value}>{children}</WalksContext.Provider>;
}

export function useLiveWalk() {
  const ctx = useContext(WalksContext);
  if (!ctx) throw new Error('useLiveWalk needs WalksProvider');
  return ctx;
}
