import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { palette } from '@/theme/tokens';
import type { IconName } from '@/components/ui/Icon';

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

const KEY = 'dogbetter.reminders.v1';

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
  const [all, setAll] = useState<Reminder[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setAll(JSON.parse(raw) as Reminder[]);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((updater: (prev: Reminder[]) => Reminder[]) => {
    setAll((prev) => {
      const next = updater(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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
