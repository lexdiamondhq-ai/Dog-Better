import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Href } from 'expo-router';

import type { IconName } from '@/components/ui/Icon';
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
export function pickDuty(input: { name: string; dueToday: Reminder[]; walksToday: number; heatF: number | null; now?: Date }): Duty {
  const now = input.now ?? new Date();
  const hour = now.getHours();
  const name = input.name;

  const live = [...input.dueToday].sort((a, b) => a.time.localeCompare(b.time));
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

export function useHeatF() {
  const [heatF, setHeatF] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m&temperature_unit=fahrenheit`;
        const res = await fetch(url);
        const json = (await res.json()) as { current?: { temperature_2m?: number } };
        if (alive && typeof json.current?.temperature_2m === 'number') setHeatF(json.current.temperature_2m);
      } catch {
        /* heat is optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return heatF;
}

export function useWalksToday(dogId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!dogId) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    fetchRecentWalks(dogId, 8)
      .then((rows) => setCount(rows.filter((w) => new Date(w.started_at).getTime() >= start.getTime()).length))
      .catch(() => setCount(0));
  }, [dogId]);

  return count;
}
