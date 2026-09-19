import type { Href } from 'expo-router';

import type { IconName } from '@/components/ui/Icon';
import type { Meal, WeightEntry } from '@/lib/database.types';

export type FilmFrame = {
  id: string;
  label: string;
  detail: string;
  icon: IconName;
  tone: 'empty' | 'good' | 'warn' | 'bad';
  href: Href;
};

export function buildDayFilm(input: {
  mealsToday: Meal[];
  walksToday: number;
  walkMinutes: number;
  weightToday: WeightEntry | null;
  weightLabel?: string | null;
  now?: Date;
  medsDueToday?: number;
  medsLoggedToday?: number;
}): FilmFrame[] {
  const kinds = new Set(input.mealsToday.map((m) => m.kind));
  const now = input.now ?? new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const due = input.medsDueToday ?? 0;
  const logged = input.medsLoggedToday ?? 0;
  return [
    {
      id: 'breakfast',
      label: 'Breakfast',
      detail: kinds.has('breakfast') ? 'Logged' : 'Tap',
      icon: 'sun',
      tone: kinds.has('breakfast') ? 'good' : 'empty',
      href: '/(app)/(tabs)/today',
    },
    {
      id: 'walk',
      label: 'Walk',
      detail: input.walksToday ? 'Done' : `${input.walkMinutes} min`,
      icon: 'walk',
      tone: input.walksToday ? 'good' : 'empty',
      href: '/(app)/(tabs)/track',
    },
    {
      id: 'dinner',
      label: 'Dinner',
      detail: kinds.has('dinner') ? 'Logged' : 'Tap',
      icon: 'meal',
      tone: kinds.has('dinner') ? 'good' : 'empty',
      href: '/(app)/(tabs)/today',
    },
    {
      id: 'date',
      label: weekday,
      detail: monthDay,
      icon: 'calendar',
      tone: due > 0 ? 'warn' : logged > 0 ? 'good' : 'empty',
      href: '/(app)/calendar',
    },
    {
      id: 'weight',
      label: 'Weight',
      detail: input.weightLabel ?? (input.weightToday ? 'Logged' : 'Add'),
      icon: 'weight',
      tone: input.weightToday || input.weightLabel ? 'good' : 'empty',
      href: '/(app)/(tabs)/track',
    },
  ];
}
