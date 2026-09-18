/**
 * Today's score. Midnight resets it. Nothing from last week or the profile file
 * fills the tile. A quiet morning is 0.
 */

export type ScoreInput = {
  /** Breakfast and dinner only. */
  mealsToday: number;
  /** At least one treat logged today. */
  treatsToday: boolean;
  triageToday: 'none' | 'green' | 'amber' | 'red';
  weightToday: boolean;
  momentsToday: number;
  checksToday: number;
};

export type Action = { label: string; points: number; href?: string };

export type Pillar = {
  id: 'nutrition' | 'health' | 'records' | 'connection';
  label: string;
  score: number;
  max: number;
  because: string;
  next?: Action;
};

export type BetterScore = { total: number; max: number; pillars: Pillar[]; headline: string; available: number; nextActions: Action[] };

export function computeBetterScore(i: ScoreInput): BetterScore {
  const pillars: Pillar[] = [];

  const meals = Math.max(0, Math.min(2, i.mealsToday));
  const treat = i.treatsToday ? 1 : 0;
  const nutrition = meals * 8 + treat * 8;
  const nutritionBecause =
    meals >= 2 && treat
      ? 'Both meals and a treat today.'
      : meals >= 2
        ? 'Both meals logged today.'
        : meals === 1 && treat
          ? 'One meal and a treat so far.'
          : treat
            ? 'A treat logged. Meals still open.'
            : meals === 1
              ? 'One meal logged so far.'
              : 'No meals logged yet.';
  pillars.push({
    id: 'nutrition',
    label: 'Nutrition',
    score: nutrition,
    max: 24,
    because: nutritionBecause,
    next:
      meals < 2
        ? { label: meals === 0 ? 'Log breakfast' : 'Log the next meal', points: 8 }
        : treat
          ? undefined
          : { label: 'Log a treat', points: 8 },
  });

  const health = { none: 0, green: 30, amber: 15, red: 0 }[i.triageToday];
  pillars.push({
    id: 'health',
    label: 'Health',
    score: health,
    max: 30,
    because: {
      none: 'No health check yet today.',
      green: 'Logged signs were fine to watch at home.',
      amber: 'A vet call was needed today.',
      red: 'An emergency was logged today.',
    }[i.triageToday],
    next:
      i.triageToday === 'none'
        ? { label: 'Log how they are', points: 30, href: '/(app)/symptoms' }
        : i.triageToday === 'amber' || i.triageToday === 'red'
          ? { label: 'Re-check how they are today', points: i.triageToday === 'red' ? 15 : 10, href: '/(app)/symptoms' }
          : undefined,
  });

  const records = i.weightToday ? 10 : 0;
  pillars.push({
    id: 'records',
    label: 'Records',
    score: records,
    max: 10,
    because: i.weightToday ? 'Weight logged today.' : 'No weight logged today.',
    next: i.weightToday ? undefined : { label: 'Log a weight', points: 10, href: '/(app)/(tabs)/track' },
  });

  const moments = Math.min(10, i.momentsToday * 5);
  const checks = Math.min(10, i.checksToday * 5);
  const connection = moments + checks;
  pillars.push({
    id: 'connection',
    label: 'Connection',
    score: connection,
    max: 20,
    because: `${i.momentsToday} ${i.momentsToday === 1 ? 'moment' : 'moments'} and ${i.checksToday} ${i.checksToday === 1 ? 'check' : 'checks'} today.`,
    next: moments < 10 ? { label: 'Add a photo or play moment', points: 5, href: '/(app)/snap' } : checks < 10 ? { label: 'Check a treat or log a symptom', points: 5, href: '/(app)/scan' } : undefined,
  });

  const total = pillars.reduce((a, p) => a + p.score, 0);
  const max = pillars.reduce((a, p) => a + p.max, 0);
  const nextActions = pillars.flatMap((p) => (p.next ? [p.next] : [])).sort((a, b) => b.points - a.points);
  const available = nextActions.reduce((a, n) => a + n.points, 0);
  const headline = total <= 0 ? 'Nothing logged yet today' : total >= 60 ? 'A full day so far' : total >= 30 ? 'Good start' : 'Warming up';
  return { total, max, pillars, headline, available, nextActions };
}
