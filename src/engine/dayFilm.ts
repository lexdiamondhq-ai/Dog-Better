import type { Href } from 'expo-router';

import type { IconName } from '@/components/ui/Icon';
import type { HealthLog, Meal, WeightEntry } from '@/lib/database.types';

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
  healthToday: HealthLog[];
  weightToday: WeightEntry | null;
  lookOverToday: boolean;
}): FilmFrame[] {
  const kinds = new Set(input.mealsToday.map((m) => m.kind));
  const health = input.healthToday[0];
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
      id: 'look',
      label: 'Look-over',
      detail: input.lookOverToday ? 'Done' : health ? ({ green: 'Quiet', amber: 'Watch', red: 'Urgent' }[health.triage] ?? health.triage) : 'Open',
      icon: 'care',
      tone: input.lookOverToday || health?.triage === 'green' ? 'good' : health?.triage === 'amber' ? 'warn' : health?.triage === 'red' ? 'bad' : 'empty',
      href: '/(app)/look-over',
    },
    {
      id: 'weight',
      label: 'Weight',
      detail: input.weightToday ? 'Logged' : 'Add',
      icon: 'weight',
      tone: input.weightToday ? 'good' : 'empty',
      href: '/(app)/(tabs)/track',
    },
  ];
}
