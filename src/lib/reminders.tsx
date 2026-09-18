import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { palette } from '@/theme/tokens';
import type { IconName } from '@/components/ui/Icon';

import { useAuth } from './auth';
import { useDogs } from './dogs';
import { syncReminderNotifications, watchReminderDelivered } from './notify';
import { usePreferences } from './preferences';

export type ReminderKind = 'treat' | 'medication' | 'meal' | 'walk' | 'groom' | 'vet' | 'vaccine' | 'training' | 'boarding' | 'birthday' | 'other';

export type Reminder = {
  id: string;
  dogId: string;
  kind: ReminderKind;
  title: string;
  time: string;
  date: string;
  notes?: string;
  color?: string;
  /** ISO time the dose or event was marked given. Open reminders omit this. */
  completedAt?: string;
};

const LEGACY_KEY = 'dogbetter.reminders.v1';
const keyFor = (userId: string) => `dogbetter.reminders.v2.${userId}`;

function parseRows(raw: string | null): Reminder[] {
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw) as Reminder[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function readRemindersForExport(userId: string, dogIds: string[]) {
  const rows = parseRows(await AsyncStorage.getItem(keyFor(userId)));
  const allow = new Set(dogIds);
  return allow.size ? rows.filter((r) => allow.has(r.dogId)) : rows;
}

export async function wipeRemindersForUser(userId: string) {
  await AsyncStorage.removeItem(keyFor(userId));
}

export const REMINDER_KINDS: { id: ReminderKind; label: string; color: string; icon: IconName }[] = [
  { id: 'treat', label: 'Treat', color: palette.amber, icon: 'paw' },
  { id: 'medication', label: 'Meds', color: palette.garnet, icon: 'pill' },
  { id: 'meal', label: 'Meal', color: palette.amberDeep, icon: 'meal' },
  { id: 'walk', label: 'Walk', color: palette.forest, icon: 'walk' },
  { id: 'groom', label: 'Groom', color: palette.lapis, icon: 'happy' },
  { id: 'vet', label: 'Vet', color: palette.terracotta, icon: 'vet' },
  { id: 'vaccine', label: 'Vaccine', color: palette.cocoa, icon: 'vaccine' },
  { id: 'training', label: 'Training', color: palette.amberDeep, icon: 'toy' },
  { id: 'boarding', label: 'Boarding', color: palette.cocoaLight, icon: 'careTeam' },
  { id: 'birthday', label: 'Birthday', color: palette.garnetLight, icon: 'cake' },
  { id: 'other', label: 'Other', color: palette.sand, icon: 'calendar' },
];

export function kindMeta(kind: ReminderKind) {
  return REMINDER_KINDS.find((k) => k.id === kind) ?? REMINDER_KINDS[REMINDER_KINDS.length - 1];
}

export function reminderColor(r: Pick<Reminder, 'kind' | 'color'>) {
  return r.color || kindMeta(r.kind).color;
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function clockNow(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Next 5-minute clock time at least two minutes out, so a just-saved event can still notify. */
export function nextClockSlot(from = new Date()) {
  const d = new Date(from.getTime() + 2 * 60_000);
  d.setSeconds(0, 0);
  const extra = (5 - (d.getMinutes() % 5)) % 5;
  d.setMinutes(d.getMinutes() + extra);
  return clockNow(d);
}

/** 2026-09-18 -> Today / Tomorrow / Fri, Sep 18 */
export function prettyDate(date: string, today: string) {
  if (date === today) return 'Today';
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === ymd(tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** 20:00 -> 8p */
export function prettyTime(time: string) {
  const [hRaw, m] = time.split(':');
  const h = parseInt(hRaw, 10);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? 'p' : 'a';
  const hour = h % 12 || 12;
  return m === '00' ? `${hour}${suffix}` : `${hour}:${m}${suffix}`;
}

export function isOpen(r: Reminder) {
  return !r.completedAt;
}

export function nextReminder(rows: Reminder[], kind?: ReminderKind) {
  return (
    [...rows]
      .filter((r) => isOpen(r) && (!kind || r.kind === kind))
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))[0] ?? null
  );
}

export function rosterMedLabel(r: Reminder | null) {
  if (!r) return 'None';
  const name = r.title.split(/[·,]/)[0]?.trim().split(/\s+/)[0] ?? 'Med';
  return `${name} ${prettyTime(r.time)}`;
}

type Store = {
  all: Reminder[];
  persist: (updater: (prev: Reminder[]) => Reminder[]) => void;
};

const Ctx = createContext<Store | null>(null);

export function RemindersProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [all, setAll] = useState<Reminder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { notifications, loaded: prefsLoaded } = usePreferences();
  const { dogs, loaded: dogsLoaded } = useDogs();
  const dogKey = dogs.map((d) => d.id).sort().join(',');

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setAll([]);
          setHydrated(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    if (!dogsLoaded) return;
    (async () => {
      const scoped = parseRows(await AsyncStorage.getItem(keyFor(userId)));
      if (scoped.length) {
        if (!cancelled) setAll(scoped);
        return;
      }
      const legacy = parseRows(await AsyncStorage.getItem(LEGACY_KEY));
      if (!legacy.length) {
        if (!cancelled) setAll([]);
        return;
      }
      const mineIds = new Set(dogKey ? dogKey.split(',') : []);
      const mine = legacy.filter((r) => mineIds.has(r.dogId));
      const rest = legacy.filter((r) => !mineIds.has(r.dogId));
      if (mine.length) await AsyncStorage.setItem(keyFor(userId), JSON.stringify(mine));
      if (rest.length) await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(rest));
      else await AsyncStorage.removeItem(LEGACY_KEY);
      if (!cancelled) setAll(mine);
    })()
      .catch(() => {
        if (!cancelled) setAll([]);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, dogsLoaded, dogKey]);

  const persist = useCallback((updater: (prev: Reminder[]) => Reminder[]) => {
    if (!userId) return;
    setAll((prev) => {
      const next = updater(prev);
      AsyncStorage.setItem(keyFor(userId), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [userId]);

  // The calendar is the source of truth; the phone's notification queue mirrors it. Debounced so a
  // sheet read that adds eighty doses schedules once. Sign-out clears the queue so the next account
  // does not inherit the last household's alarms.
  useEffect(() => {
    if (!prefsLoaded) return;
    if (!userId) {
      const id = setTimeout(() => void syncReminderNotifications([], notifications, new Map()), 200);
      return () => clearTimeout(id);
    }
    if (!hydrated) return;
    const names = new Map(dogs.map((d) => [d.id, d.name]));
    const id = setTimeout(() => void syncReminderNotifications(all, notifications, names), 800);
    const stop = watchReminderDelivered(() => {
      void syncReminderNotifications(all, notifications, names);
    });
    return () => {
      clearTimeout(id);
      stop();
    };
  }, [all, notifications, dogs, hydrated, prefsLoaded, userId]);

  const value = useMemo(() => ({ all, persist }), [all, persist]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReminders(dogId: string | undefined) {
  const store = useContext(Ctx);
  if (!store) throw new Error('useReminders needs RemindersProvider');
  const { all, persist } = store;

  const mine = useMemo(() => (dogId ? all.filter((r) => r.dogId === dogId) : []), [all, dogId]);

  const add = useCallback(
    (input: Omit<Reminder, 'id'>) => {
      persist((prev) => [...prev, { ...input, id: `${Date.now()}` }]);
    },
    [persist],
  );

  const addMany = useCallback(
    (inputs: Omit<Reminder, 'id'>[]) => {
      if (!inputs.length) return;
      persist((prev) => [...prev, ...inputs.map((input, i) => ({ ...input, id: `${Date.now()}-${i}` }))]);
    },
    [persist],
  );

  const replaceSheetReminders = useCallback(
    (forDog: string, inputs: Omit<Reminder, 'id'>[]) => {
      persist((prev) => {
        const kept = prev.filter((r) => !(r.dogId === forDog && r.notes?.startsWith('sheet:')));
        return [...kept, ...inputs.map((input, i) => ({ ...input, id: `${Date.now()}-sheet-${i}` }))];
      });
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((r) => r.id !== id));
    },
    [persist],
  );

  const complete = useCallback(
    (id: string, kind?: ReminderKind) => {
      const remaining = mine.filter((r) => r.id !== id && isOpen(r));
      persist((prev) => prev.map((r) => (r.id === id && !r.completedAt ? { ...r, completedAt: new Date().toISOString() } : r)));
      return nextReminder(remaining, kind);
    },
    [mine, persist],
  );

  const reopen = useCallback(
    (id: string) => {
      persist((prev) => prev.map((r) => (r.id === id ? { ...r, completedAt: undefined } : r)));
    },
    [persist],
  );

  const onDay = useCallback((date: string) => mine.filter((r) => r.date === date).sort((a, b) => a.time.localeCompare(b.time)), [mine]);

  const marked = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of mine) {
      const colors = map.get(r.date) ?? [];
      const c = reminderColor(r);
      if (!colors.includes(c)) colors.push(c);
      map.set(r.date, colors);
    }
    return map;
  }, [mine]);

  const dueToday = useMemo(() => onDay(ymd(new Date())).filter(isOpen), [onDay]);
  const upcoming = useMemo(() => {
    const today = ymd(new Date());
    return [...mine]
      .filter((r) => isOpen(r) && r.date >= today)
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  }, [mine]);
  const nextMed = useMemo(() => nextReminder(mine, 'medication'), [mine]);

  return { add, addMany, replaceSheetReminders, remove, complete, reopen, onDay, marked, upcoming, dueToday, nextMed, today: ymd(new Date()), count: mine.length };
}

export function monthDays(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const pad = (start.getDay() + 6) % 7;
  const days: { date: string; day: number; inMonth: boolean }[] = [];
  const cursor = new Date(start);
  cursor.setDate(1 - pad);
  for (let i = 0; i < 42; i++) {
    days.push({ date: ymd(cursor), day: cursor.getDate(), inMonth: cursor.getMonth() === anchor.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
