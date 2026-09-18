import type { Href } from 'expo-router';

import type { IconName } from '@/components/ui/Icon';
import { JAR_POCKET, REWARDS, type RewardKind } from '@/engine/rewards';

const SLOT = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

export type JarNext = {
  title: string;
  hint: string;
  href: Href;
  icon: IconName;
  meal?: 'breakfast' | 'dinner' | 'treat';
  startWalk?: boolean;
};

export function pickJarNext(input: {
  pocket: number;
  mealKinds: Iterable<string>;
  walksToday: number;
  counts: Partial<Record<RewardKind, number>>;
  hasWeight: boolean;
  hour?: number;
}): JarNext {
  const pocket = Math.max(0, Math.min(JAR_POCKET, input.pocket));
  const title = pocket <= 0 ? 'Jar is empty' : pocket >= JAR_POCKET ? 'Jar is full' : `Jar holds ${pocket}`;
  if (pocket >= JAR_POCKET) {
    return { title, hint: 'See every treat in the tally.', href: '/(app)/settings/points', icon: 'paw' };
  }

  const meals = new Set(input.mealKinds);
  const hour = input.hour ?? new Date().getHours();
  const room = (kind: RewardKind) => {
    const cap = REWARDS[kind].dailyCap;
    return cap == null || (input.counts[kind] ?? 0) < cap;
  };
  const fill = (action: string) => {
    const slot = SLOT[pocket] ?? 'next';
    return pocket <= 0 ? `${action} drops the first biscuit.` : `${action} fills the ${slot}.`;
  };

  const breakfast = !meals.has('breakfast') && room('meal');
  const dinner = !meals.has('dinner') && room('meal');
  const treat = !meals.has('treat') && room('treat');
  const walk = input.walksToday === 0 && room('walk') && hour >= 6 && hour < 21;

  type Cand = Omit<JarNext, 'title'>;
  let pick: Cand | null = null;
  if (breakfast && hour < 14) pick = { hint: fill('Breakfast'), href: '/(app)/(tabs)/today', icon: 'sun', meal: 'breakfast' };
  else if (walk) pick = { hint: fill('A 10-minute walk'), href: '/(app)/(tabs)/track', icon: 'walk', startWalk: true };
  else if (dinner && hour >= 15) pick = { hint: fill('Dinner'), href: '/(app)/(tabs)/today', icon: 'meal', meal: 'dinner' };
  else if (breakfast) pick = { hint: fill('Breakfast'), href: '/(app)/(tabs)/today', icon: 'sun', meal: 'breakfast' };
  else if (dinner) pick = { hint: fill('Dinner'), href: '/(app)/(tabs)/today', icon: 'meal', meal: 'dinner' };
  else if (!input.hasWeight && room('weight')) pick = { hint: fill('A weight log'), href: '/(app)/(tabs)/track', icon: 'weight' };
  else if (treat && hour >= 10) pick = { hint: fill('A treat'), href: '/(app)/(tabs)/today', icon: 'paw', meal: 'treat' };
  else if (room('photo')) pick = { hint: fill('A photo'), href: '/(app)/snap', icon: 'camera' };
  else if (room('scan')) pick = { hint: fill('Checking a treat'), href: '/(app)/scan', icon: 'scan' };
  else if (room('tip')) pick = { hint: fill("Tonight's five minutes"), href: '/(app)/(tabs)/learn', icon: 'learn' };
  else if (room('health')) pick = { hint: fill('A symptom log'), href: '/(app)/symptoms', icon: 'detective' };
  else if (room('place')) pick = { hint: fill('Pinning a safe spot'), href: '/(app)/walk-spots', icon: 'places' };
  else if (room('post')) pick = { hint: fill('A post with the pack'), href: '/(app)/new-post', icon: 'happy' };
  else pick = { hint: fill('A 10-minute walk'), href: '/(app)/(tabs)/track', icon: 'walk', startWalk: true };

  return { title, ...pick };
}
