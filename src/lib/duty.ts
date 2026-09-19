import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Href } from 'expo-router';

import type { IconName } from '@/components/ui/Icon';
import { estimatePavement, type Pavement } from '@/engine/pavement';
import { kindMeta, type Reminder } from '@/lib/reminders';
import { fetchRecentWalks } from '@/lib/walks';

export type Duty = {
  line: string;
  label: string;
  icon: IconName;
  href: Href;
};

function minutesUntil(time: string, now: Date) {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 999;
  return h * 60 + m - (now.getHours() * 60 + now.getMinutes());
}

/** Next real obligation. Never a meal log. If the roster is clear, Look is the aisle move. */
export function pickDuty(input: { name: string; dueToday: Reminder[]; nextMed?: Reminder | null; walksToday: number; heatF: number | null; now?: Date }): Duty {
  const now = input.now ?? new Date();
  const hour = now.getHours();
  const name = input.name;

  const live = [...input.dueToday, ...(input.nextMed && !input.dueToday.some((r) => r.id === input.nextMed?.id) ? [input.nextMed] : [])].sort((a, b) => a.time.localeCompare(b.time));
  const pressing = live.find((r) => {
    const eta = minutesUntil(r.time, now);
    return eta <= 90;
  });

  if (pressing) {
    const meta = kindMeta(pressing.kind);
    const eta = minutesUntil(pressing.time, now);
    const when = eta < 0 ? 'overdue' : eta === 0 ? 'now' : `in ${eta} min`;
    if (pressing.kind === 'medication') {
      return { line: `${pressing.title} is ${when}.`, label: `Give ${pressing.title}`, icon: 'pill', href: '/(app)/calendar' };
    }
    if (pressing.kind === 'meal') {
      return { line: `${pressing.title} is ${when}.`, label: pressing.title, icon: 'meal', href: '/(app)/calendar' };
    }
    if (pressing.kind === 'walk') {
      return { line: `${name}'s walk is ${when}.`, label: eta < 0 ? 'Start a walk' : 'Open Track', icon: 'walk', href: '/(app)/(tabs)/track' };
    }
    if (pressing.kind === 'vet' || pressing.kind === 'vaccine') {
      return { line: `${pressing.title} · ${pressing.time}`, label: 'Open calendar', icon: meta.icon, href: '/(app)/calendar' };
    }
    return { line: `${pressing.title} is ${when}.`, label: pressing.title, icon: meta.icon, href: '/(app)/calendar' };
  }

  if (input.walksToday === 0 && hour >= 7 && hour < 20) {
    const hot = input.heatF != null && input.heatF >= 88;
    return {
      line: hot ? `${name} still needs a loop. Keep it short and on grass.` : `${name} has not been out yet.`,
      label: 'Start a walk',
      icon: 'walk',
      href: '/(app)/(tabs)/track',
    };
  }

  if (hour >= 16) {
    return { line: `Whoever has ${name} tonight should not have to guess.`, label: 'Send the care sheet', icon: 'document', href: '/(app)/care-team' };
  }

  return { line: `The roster is clear. Point the camera at ${name}.`, label: 'Look at this photo', icon: 'sparkle', href: '/(app)/look' };
}

type Meteo = {
  current?: { temperature_2m?: number; cloud_cover?: number; uv_index?: number };
  hourly?: { time?: string[]; temperature_2m?: number[]; cloud_cover?: number[]; uv_index?: number[] };
};

/** Heat is optional. Never prompt. Only fill the tile if location was already granted on a map or walk. */
export function usePavement() {
  const [heat, setHeat] = useState<Pavement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,cloud_cover,uv_index&hourly=temperature_2m,cloud_cover,uv_index&temperature_unit=fahrenheit&forecast_days=1`;
        const res = await fetch(url);
        const json = (await res.json()) as Meteo;
        const air = json.current?.temperature_2m;
        if (!alive || typeof air !== 'number') return;
        const hourly = (json.hourly?.time ?? []).map((stamp, i) => ({
          hour: new Date(stamp).getHours(),
          airF: json.hourly?.temperature_2m?.[i] ?? air,
          cloudPct: json.hourly?.cloud_cover?.[i] ?? null,
          uv: json.hourly?.uv_index?.[i] ?? null,
        }));
        setHeat(
          estimatePavement({
            airF: air,
            cloudPct: json.current?.cloud_cover ?? null,
            uv: json.current?.uv_index ?? null,
            hourly,
          }),
        );
      } catch {
        /* heat is optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return heat;
}

export function useHeatF() {
  return usePavement()?.airF ?? null;
}

export function useWalksToday(dogId: string | undefined) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dogId) {
      setCount(0);
      setLoading(false);
      return;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    setLoading(true);
    fetchRecentWalks(dogId, 8)
      .then((rows) => setCount(rows.filter((w) => new Date(w.started_at).getTime() >= start.getTime()).length))
      .catch(() => setCount(0))
      .finally(() => setLoading(false));
  }, [dogId]);

  return { count, loading };
}
