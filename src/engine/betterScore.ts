import type { Dog } from '@/lib/database.types';

/**
 * The Better Score is a gentle 0-100 nudge, not a grade. Every point is explainable, and the
 * score never punishes silence: a pillar with nothing logged today holds its last known state
 * rather than dropping to zero. Its job is to point at the next best action, so each pillar
 * carries the single action that would add the most points and how many.
 */

export type ScoreInput = {
  dog: Dog | null;
  mealsToday: number;
  worstTriage7d: 'none' | 'green' | 'amber' | 'red';
  lastWeightDaysAgo: number | null;
  /** Purposeful moments this week: photos, play, training, grooming, calm time. */
  momentsThisWeek: number;
  /** Deliberate checks this week: treat checks, symptom logs, weight. */
  checksThisWeek: number;
};

export type Action = { label: string; points: number; href?: string };

export type Pillar = {
  id: 'nutrition' | 'health' | 'records' | 'connection';
  label: string;
  score: number;
  max: number;
  /** One sentence on why the score is what it is. */
  because: string;
  /** The one thing that would add the most points, if anything. */
  next?: Action;
};

export type BetterScore = { total: number; pillars: Pillar[]; headline: string; available: number; nextActions: Action[] };

export function computeBetterScore(i: ScoreInput): BetterScore {
  const pillars: Pillar[] = [];

  // Nutrition (30): meals logged today. Nothing logged reads as "not yet", not as "did not feed".
  const nutrition = i.mealsToday >= 2 ? 30 : i.mealsToday === 1 ? 18 : 0;
  pillars.push({
    id: 'nutrition',
    label: 'Nutrition',
    score: nutrition,
    max: 30,
    because: i.mealsToday >= 2 ? 'Both meals logged today.' : i.mealsToday === 1 ? 'One meal logged so far.' : 'No meals logged yet.',
    next: nutrition < 30 ? { label: i.mealsToday === 0 ? 'Log breakfast' : 'Log the next meal', points: i.mealsToday === 0 ? 18 : 12 } : undefined,
  });

  // Health (30): what the last seven days of symptom checks say. No checks is neutral-good, not a penalty.
  const health = { none: 26, green: 30, amber: 15, red: 0 }[i.worstTriage7d];
  pillars.push({
    id: 'health',
    label: 'Health',
    score: health,
    max: 30,
    because: {
      none: 'No symptoms logged this week.',
      green: 'Logged signs were fine to watch at home.',
      amber: 'A vet call was needed this week.',
      red: 'An emergency was logged this week.',
    }[i.worstTriage7d],
    next: i.worstTriage7d === 'amber' || i.worstTriage7d === 'red' ? { label: 'Re-check how they are today', points: i.worstTriage7d === 'red' ? 15 : 10, href: '/(app)/symptoms' } : undefined,
  });

  // Records (20): weight within 30 days, and a complete profile.
  const weightFresh = i.lastWeightDaysAgo != null && i.lastWeightDaysAgo <= 30;
  const profileFull = !!(i.dog?.birthdate && i.dog?.breed);
  const records = (weightFresh ? 10 : 0) + (profileFull ? 10 : 0);
  pillars.push({
    id: 'records',
    label: 'Records',
    score: records,
    max: 20,
    because: weightFresh && profileFull ? 'Weight recent, profile complete.' : !weightFresh && !profileFull ? 'Weight stale, profile incomplete.' : !weightFresh ? `Last weight was ${i.lastWeightDaysAgo == null ? 'never' : `${i.lastWeightDaysAgo} days ago`}.` : 'Profile is missing breed or birthday.',
    next: !weightFresh ? { label: 'Log a weight', points: 10, href: '/(app)/(tabs)/track' } : !profileFull ? { label: 'Add breed and birthday', points: 10, href: '/(app)/dog/edit' } : undefined,
  });

  // Connection (20): purposeful time together and deliberate checks. Defined, not vibes.
  const moments = Math.min(10, i.momentsThisWeek * 5);
  const checks = Math.min(10, i.checksThisWeek * 5);
  const connection = moments + checks;
  pillars.push({
    id: 'connection',
    label: 'Connection',
    score: connection,
    max: 20,
    because: `${i.momentsThisWeek} ${i.momentsThisWeek === 1 ? 'moment' : 'moments'} and ${i.checksThisWeek} ${i.checksThisWeek === 1 ? 'check' : 'checks'} logged this week.`,
    next: moments < 10 ? { label: 'Add a photo or play moment', points: 5, href: '/(app)/snap' } : checks < 10 ? { label: 'Check a treat or log a symptom', points: 5, href: '/(app)/scan' } : undefined,
  });

  const total = pillars.reduce((a, p) => a + p.score, 0);
  const nextActions = pillars.flatMap((p) => (p.next ? [p.next] : [])).sort((a, b) => b.points - a.points);
  const available = nextActions.reduce((a, n) => a + n.points, 0);
  const headline = total >= 85 ? 'Dogging better every day' : total >= 60 ? 'Good week so far' : total >= 35 ? 'Warming up' : 'Let us get started';
  return { total, pillars, headline, available, nextActions };
}
