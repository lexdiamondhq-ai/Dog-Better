import type { IconName } from '@/components/ui/Icon';

export type RewardKind =
  | 'meal'
  | 'walk'
  | 'photo'
  | 'post'
  | 'comment'
  | 'scan'
  | 'health'
  | 'tip'
  | 'weight'
  | 'place'
  | 'pulse'
  | 'dog';

export type Reward = {
  kind: RewardKind;
  points: number;
  label: string;
  hint: string;
  icon: IconName;
  /** Max awards of this kind in one calendar day. Undefined means no daily cap. */
  dailyCap?: number;
};

export const REWARDS: Record<RewardKind, Reward> = {
  meal: { kind: 'meal', points: 8, label: 'Log a meal', hint: 'Breakfast, dinner, or a treat on Today', icon: 'meal', dailyCap: 4 },
  walk: { kind: 'walk', points: 25, label: 'Finish a walk', hint: 'Start and save a walk on Track', icon: 'walk', dailyCap: 3 },
  photo: { kind: 'photo', points: 15, label: 'Save a photo', hint: 'Snap paws, ears, or a moment', icon: 'camera', dailyCap: 6 },
  post: { kind: 'post', points: 20, label: 'Share with the pack', hint: 'Post a moment in Community', icon: 'happy', dailyCap: 3 },
  comment: { kind: 'comment', points: 6, label: 'Leave a comment', hint: 'Say something useful on a post', icon: 'comment', dailyCap: 5 },
  scan: { kind: 'scan', points: 12, label: 'Check a treat', hint: 'Scan a barcode or paste ingredients', icon: 'scan', dailyCap: 5 },
  health: { kind: 'health', points: 12, label: 'Log a health check', hint: 'Run the symptom detective and save', icon: 'detective', dailyCap: 4 },
  tip: { kind: 'tip', points: 8, label: 'Finish tonight', hint: 'Run the five-minute session on Learn', icon: 'learn', dailyCap: 3 },
  weight: { kind: 'weight', points: 10, label: 'Log a weight', hint: 'Update weight on Track', icon: 'weight', dailyCap: 1 },
  place: { kind: 'place', points: 18, label: 'Add a safe space', hint: 'Pin a park, trail, or patio', icon: 'places', dailyCap: 3 },
  pulse: { kind: 'pulse', points: 8, label: 'Report how a spot feels', hint: 'Send a crowd pulse on a place', icon: 'pin', dailyCap: 4 },
  dog: { kind: 'dog', points: 30, label: 'Add a dog', hint: 'Give another dog their own profile', icon: 'paw' },
};

export const REWARD_LIST = Object.values(REWARDS);

export type BetterLevel = { name: string; min: number; line: string };

export const LEVELS: BetterLevel[] = [
  { name: 'Pup', min: 0, line: 'First steps. Every log counts.' },
  { name: 'Walker', min: 80, line: 'You are showing up on the days that matter.' },
  { name: 'Pack mate', min: 220, line: 'Meals, walks, and notes are becoming a habit.' },
  { name: 'Trail lead', min: 480, line: 'The household looks to you for the plan.' },
  { name: 'Better legend', min: 900, line: 'This is what Dog Better looks like lived in.' },
];

export function levelFor(total: number): BetterLevel & { next: BetterLevel | null; into: number } {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (total >= level.min) current = level;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  const into = next ? Math.min(1, (total - current.min) / span) : 1;
  return { ...current, next, into };
}

export function pointsLabel(n: number) {
  return `+${n}`;
}
