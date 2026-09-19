import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { palette } from '@/theme/tokens';
import type { IconName } from '@/components/ui/Icon';

import { useAuth } from './auth';
import type { Database } from './database.types';
import { useDogs } from './dogs';
import { syncReminderNotifications, watchReminderDelivered } from './notify';
import { usePreferences } from './preferences';
import { supabase } from './supabase';

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
  completedBy?: string;
  completedByName?: string;
};

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

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

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function actorName(email?: string | null, display?: string | null) {
  return display?.trim() || email?.split('@')[0] || 'Someone';
}

function clockOf(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function fromRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    dogId: row.dog_id,
    kind: row.kind as ReminderKind,
    title: row.title,
    time: clockOf(row.time),
    date: row.date,
    notes: row.notes ?? undefined,
    color: row.color ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    completedByName: row.completed_by_name ?? undefined,
  };
}

function toInsert(r: Reminder, ownerId: string) {
  return {
    id: r.id,
    dog_id: r.dogId,
    owner_id: ownerId,
    kind: r.kind,
    title: r.title,
    time: r.time,
    date: r.date,
    notes: r.notes ?? null,
    color: r.color ?? null,
    completed_at: r.completedAt ?? null,
    completed_by: r.completedBy ?? null,
    completed_by_name: r.completedByName ?? null,
  };
}

async function fetchCloud(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase.from('reminders').select('*').eq('owner_id', userId).order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

async function pushDiff(userId: string, prev: Reminder[], next: Reminder[]) {
  const nextIds = new Set(next.map((r) => r.id));
  const removed = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
  const changed = next.filter((r) => {
    const old = prev.find((p) => p.id === r.id);
    return !old || JSON.stringify(old) !== JSON.stringify(r);
  });
  if (removed.length) {
    const { error } = await supabase.from('reminders').delete().in('id', removed);
    if (error) throw error;
  }
  if (changed.length) {
    const { error } = await supabase.from('reminders').upsert(changed.map((r) => toInsert(r, userId)), { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function readRemindersForExport(userId: string, dogIds: string[]) {
  try {
    const rows = await fetchCloud(userId);
    const allow = new Set(dogIds);
    return allow.size ? rows.filter((r) => allow.has(r.dogId)) : rows;
  } catch {
    const rows = parseRows(await AsyncStorage.getItem(keyFor(userId)));
    const allow = new Set(dogIds);
    return allow.size ? rows.filter((r) => allow.has(r.dogId)) : rows;
  }
}

export async function wipeRemindersForUser(userId: string) {
  await AsyncStorage.removeItem(keyFor(userId));
  await supabase.from('reminders').delete().eq('owner_id', userId);
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
  if (Number.isNaN(d.getTime())) return '';
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

export function givenLine(r: Reminder) {
  if (!r.completedAt) return 'Given';
  const at = new Date(r.completedAt);
  const clock = Number.isNaN(at.getTime()) ? '' : prettyTime(clockNow(at));
  const who = r.completedByName ?? 'someone';
  return clock ? `Given by ${who} at ${clock}` : `Given by ${who}`;
}

export type MedCourse = {
  key: string;
  title: string;
  times: string[];
  start: string;
  end: string;
  days: number;
  remaining: number;
  total: number;
  next: Reminder | null;
};

/** One card per medication: how much, which clocks, and which days. */
export function coursesFromReminders(rows: Reminder[]): MedCourse[] {
  const groups = new Map<string, Reminder[]>();
  for (const r of rows) {
    if (r.kind !== 'medication') continue;
    const list = groups.get(r.title) ?? [];
    list.push(r);
    groups.set(r.title, list);
  }
  return [...groups.entries()].map(([title, list]) => {
    const sorted = [...list].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    const open = sorted.filter(isOpen);
    const dates = [...new Set(sorted.map((r) => r.date))];
    return {
      key: title,
      title,
      times: [...new Set(sorted.map((r) => r.time))].sort(),
      start: dates[0] ?? '',
      end: dates[dates.length - 1] ?? '',
      days: dates.length,
      remaining: open.length,
      total: sorted.length,
      next: open[0] ?? null,
    };
  });
}

export function courseDayLine(course: MedCourse, today: string) {
  if (!course.start) return `${course.days} day${course.days === 1 ? '' : 's'}`;
  if (course.start === course.end) return prettyDate(course.start, today);
  return `${prettyDate(course.start, today)} through ${prettyDate(course.end, today)} · ${course.days} days`;
}

type Store = {
  all: Reminder[];
  persist: (updater: (prev: Reminder[]) => Reminder[]) => void;
  hydrated: boolean;
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
  const allRef = useRef(all);
  allRef.current = all;
  const writing = useRef(false);

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
      try {
        const cloud = await fetchCloud(userId);
        if (cloud.length) {
          if (!cancelled) setAll(cloud);
          await AsyncStorage.setItem(keyFor(userId), JSON.stringify(cloud));
          return;
        }
        const scoped = parseRows(await AsyncStorage.getItem(keyFor(userId)));
        const legacy = scoped.length ? scoped : parseRows(await AsyncStorage.getItem(LEGACY_KEY));
        const mineIds = new Set(dogKey ? dogKey.split(',') : []);
        const mine = (scoped.length ? scoped : legacy.filter((r) => mineIds.has(r.dogId))).map((r) => ({
          ...r,
          id: r.id.includes('-') && r.id.length >= 32 ? r.id : newId(),
        }));
        if (mine.length) {
          await supabase.from('reminders').upsert(mine.map((r) => toInsert(r, userId)), { onConflict: 'id' });
          await AsyncStorage.setItem(keyFor(userId), JSON.stringify(mine));
        }
        if (!scoped.length && legacy.length) {
          const rest = legacy.filter((r) => !mineIds.has(r.dogId));
          if (rest.length) await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(rest));
          else await AsyncStorage.removeItem(LEGACY_KEY);
        }
        if (!cancelled) setAll(mine);
      } catch {
        const scoped = parseRows(await AsyncStorage.getItem(keyFor(userId)));
        if (!cancelled) setAll(scoped);
      }
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

  useEffect(() => {
    if (!userId || !hydrated) return;
    const channel = supabase
      .channel(`reminders-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `owner_id=eq.${userId}` }, () => {
        if (writing.current) return;
        void fetchCloud(userId)
          .then((rows) => {
            setAll(rows);
            AsyncStorage.setItem(keyFor(userId), JSON.stringify(rows)).catch(() => {});
          })
          .catch(() => {});
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, hydrated]);

  const persist = useCallback(
    (updater: (prev: Reminder[]) => Reminder[]) => {
      if (!userId) return;
      setAll((prev) => {
        const next = updater(prev);
        AsyncStorage.setItem(keyFor(userId), JSON.stringify(next)).catch(() => {});
        writing.current = true;
        void pushDiff(userId, prev, next)
          .catch(() => {})
          .finally(() => {
            writing.current = false;
          });
        return next;
      });
    },
    [userId],
  );

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

  const value = useMemo(() => ({ all, persist, hydrated }), [all, persist, hydrated]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReminders(dogId: string | undefined) {
  const store = useContext(Ctx);
  if (!store) throw new Error('useReminders needs RemindersProvider');
  const { user } = useAuth();
  const { all, persist, hydrated } = store;

  const mine = useMemo(() => (dogId ? all.filter((r) => r.dogId === dogId) : []), [all, dogId]);

  const add = useCallback(
    (input: Omit<Reminder, 'id'>) => {
      persist((prev) => [...prev, { ...input, id: newId() }]);
    },
    [persist],
  );

  const addMany = useCallback(
    (inputs: Omit<Reminder, 'id'>[]) => {
      if (!inputs.length) return;
      persist((prev) => [...prev, ...inputs.map((input) => ({ ...input, id: newId() }))]);
    },
    [persist],
  );

  const replaceSheetReminders = useCallback(
    (forDog: string, inputs: Omit<Reminder, 'id'>[]) => {
      persist((prev) => {
        const kept = prev.filter((r) => !(r.dogId === forDog && r.notes?.startsWith('sheet:')));
        return [...kept, ...inputs.map((input) => ({ ...input, id: newId() }))];
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
      const who = actorName(user?.email, typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null);
      persist((prev) =>
        prev.map((r) =>
          r.id === id && !r.completedAt
            ? { ...r, completedAt: new Date().toISOString(), completedBy: user?.id, completedByName: who }
            : r,
        ),
      );
      return nextReminder(remaining, kind);
    },
    [mine, persist, user],
  );

  const reopen = useCallback(
    (id: string) => {
      persist((prev) => prev.map((r) => (r.id === id ? { ...r, completedAt: undefined, completedBy: undefined, completedByName: undefined } : r)));
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
  const openMeds = useMemo(
    () =>
      mine
        .filter((r) => r.kind === 'medication' && isOpen(r))
        .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))),
    [mine],
  );
  const courses = useMemo(() => coursesFromReminders(mine), [mine]);

  return { add, addMany, replaceSheetReminders, remove, complete, reopen, onDay, marked, upcoming, dueToday, nextMed, openMeds, courses, today: ymd(new Date()), count: mine.length, loaded: hydrated };
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

/** Seven-day rows so the grid never depends on percent width inside a wrapping row. */
export function monthWeeks(anchor: Date) {
  const days = monthDays(anchor);
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function dateInMonth(date: string, cursor: Date) {
  const d = new Date(`${date}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
}
