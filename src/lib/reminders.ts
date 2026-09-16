import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { palette } from '@/theme/tokens';
import type { IconName } from '@/components/ui/Icon';

export type ReminderKind = 'treat' | 'medication' | 'walk' | 'groom' | 'vet' | 'vaccine' | 'training' | 'boarding' | 'birthday' | 'other';

export type Reminder = {
  id: string;
  dogId: string;
  kind: ReminderKind;
  title: string;
  time: string;
  date: string;
  notes?: string;
  color?: string;
};

const KEY = 'dogbetter.reminders.v1';

export const REMINDER_KINDS: { id: ReminderKind; label: string; color: string; icon: IconName }[] = [
  { id: 'treat', label: 'Treat', color: palette.amber, icon: 'paw' },
  { id: 'medication', label: 'Meds', color: palette.garnet, icon: 'pill' },
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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useReminders(dogId: string | undefined) {
  const [all, setAll] = useState<Reminder[]>([]);

  const persist = useCallback((next: Reminder[]) => {
    setAll(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setAll(JSON.parse(raw) as Reminder[]);
      })
      .catch(() => {});
  }, []);

  const mine = useMemo(() => (dogId ? all.filter((r) => r.dogId === dogId) : []), [all, dogId]);

  const add = useCallback(
    (input: Omit<Reminder, 'id'>) => {
      persist([...all, { ...input, id: `${Date.now()}` }]);
    },
    [all, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(all.filter((r) => r.id !== id));
    },
    [all, persist],
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

  const dueToday = useMemo(() => onDay(ymd(new Date())), [onDay]);

  const upcoming = useMemo(() => {
    const today = ymd(new Date());
    const now = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    return [...mine]
      .filter((r) => r.date > today || (r.date === today && r.time >= now))
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  }, [mine]);

  return { add, remove, onDay, marked, upcoming, dueToday, today: ymd(new Date()), count: mine.length };
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
