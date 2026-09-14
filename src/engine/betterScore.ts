import type { Dog } from '@/lib/database.types';

/**
 * The Better Score is a gentle 0-100 nudge, not a grade. It rewards the habits the app
 * exists for: feeding on schedule, keeping an eye on health, keeping records fresh, and
 * spending attention on the dog. Each pillar is capped so no single behaviour dominates.
 */

export type ScoreInput = {
  dog: Dog | null;
  mealsToday: number;
  worstTriage7d: 'none' | 'green' | 'amber' | 'red';
  lastWeightDaysAgo: number | null;
  momentsThisWeek: number; // photos + posts
  engagementsThisWeek: number; // bark sessions + pulses + scans
};

export type Pillar = { id: 'nutrition' | 'health' | 'records' | 'connection'; label: string; score: number; max: number; hint: string };

export function computeBetterScore(i: ScoreInput): { total: number; pillars: Pillar[]; headline: string } {
  const nutrition = i.mealsToday >= 2 ? 30 : i.mealsToday === 1 ? 18 : 0;
  const health = { none: 24, green: 30, amber: 15, red: 0 }[i.worstTriage7d];
  const records = (i.lastWeightDaysAgo != null && i.lastWeightDaysAgo <= 30 ? 10 : 0) + (i.dog?.birthdate && i.dog?.breed ? 10 : 0);
  const connection = Math.min(10, i.momentsThisWeek * 5) + Math.min(10, i.engagementsThisWeek * 5);
  const connectionHint = connection >= 20 ? 'Full of moments' : i.momentsThisWeek === 0 ? 'Snap a photo to start' : i.momentsThisWeek < 2 ? 'One more photo' : 'Try a bark or scan';

  const pillars: Pillar[] = [
    // Hints render on a single line beside the score ring, so keep them under ~18 characters.
    { id: 'nutrition', label: 'Nutrition', score: nutrition, max: 30, hint: i.mealsToday >= 2 ? 'Meals logged today' : i.mealsToday === 1 ? 'One meal to go' : 'Log a meal to start' },
    { id: 'health', label: 'Health', score: health, max: 30, hint: { none: 'No symptom checks', green: 'Clear this week', amber: 'Something to watch', red: 'Vet was needed' }[i.worstTriage7d] },
    { id: 'records', label: 'Records', score: records, max: 20, hint: records === 20 ? 'Vault is up to date' : 'Add weight or age' },
    { id: 'connection', label: 'Connection', score: connection, max: 20, hint: connectionHint },
  ];

  const total = pillars.reduce((a, p) => a + p.score, 0);
  const headline = total >= 85 ? 'Dogging better every day' : total >= 60 ? 'Good week so far' : total >= 35 ? 'Warming up' : 'Let us get started';
  return { total, pillars, headline };
}
