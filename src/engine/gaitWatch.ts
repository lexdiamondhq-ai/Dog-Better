import type { Walk } from '@/lib/database.types';
import type { WalkPoint } from '@/lib/walks';
import { metresBetween } from '@/lib/walks';

export type GaitNote = {
  line: string;
  detail: string;
  tone: 'good' | 'warn' | 'neutral';
};

function minutesOf(w: Walk) {
  return Math.max(1, (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000);
}

function pace(w: Walk) {
  return w.steps / minutesOf(w);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Count dwells: a cluster of points that stay inside 12m for 25s+. */
export function stopCountFromPath(path: WalkPoint[]) {
  if (path.length < 3) return 0;
  let stops = 0;
  let clusterStart = 0;
  for (let i = 1; i < path.length; i++) {
    const moved = metresBetween(path[clusterStart], path[i]);
    if (moved < 12) continue;
    const dwellMin = (i - clusterStart) * 0.05;
    if (dwellMin >= 0.4) stops += 1;
    clusterStart = i;
  }
  return stops;
}

/**
 * Compare the latest walk to this dog's recent baseline.
 * Flags pace drop-off and extra stops. Needs a handful of walks before it speaks.
 */
export function gaitFromWalks(walks: Walk[], dogName: string): GaitNote | null {
  if (walks.length < 5) {
    return {
      line: `${walks.length ? 'Building' : 'Start'} ${dogName}'s walk baseline`,
      detail: 'Five walks is enough to notice a limp or a fade. The phone already records the pace.',
      tone: 'neutral',
    };
  }
  const [latest, ...rest] = walks;
  const basePace = median(rest.slice(0, 30).map(pace));
  const lastPace = pace(latest);
  const baseStops = median(rest.slice(0, 30).map((w) => w.stop_count ?? 0).filter((n) => n > 0));
  const lastStops = latest.stop_count ?? 0;
  const slower = basePace > 8 && lastPace < basePace * 0.75;
  const extraStops = baseStops >= 1 && lastStops >= baseStops * 4 && lastStops >= 4;

  if (slower && extraStops) {
    return {
      line: `${dogName} faded and stopped more than usual`,
      detail: `Pace fell ${Math.round((1 - lastPace / basePace) * 100)}% vs the last month, and they stopped ${lastStops} times. Show this to the vet if it repeats.`,
      tone: 'warn',
    };
  }
  if (slower) {
    return {
      line: `${dogName}'s pace fell off after a few minutes`,
      detail: `This loop was ${Math.round((1 - lastPace / basePace) * 100)}% slower than their 30-day normal. Soft-tissue and heat both show up this way.`,
      tone: 'warn',
    };
  }
  if (extraStops) {
    return {
      line: `${dogName} stopped ${lastStops} times, about ${Math.round(lastStops / Math.max(1, baseStops))}x their normal`,
      detail: 'A limp or sore joint often looks like extra pauses before you see it. Keep the next walk short and on grass.',
      tone: 'warn',
    };
  }
  return {
    line: `${dogName}'s last loop looks like their normal`,
    detail: `${Math.round(lastPace)} steps a minute, in line with the last ${Math.min(30, rest.length)} walks.`,
    tone: 'good',
  };
}
