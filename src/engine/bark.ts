/**
 * Bark & behaviour pattern analysis.
 *
 * Works on the microphone metering stream (dBFS samples at a fixed interval), not on raw audio,
 * so it runs instantly and fully on-device. The classifier is a transparent feature-scoring model
 * informed by bioacoustic research on canine vocalisation: alarm barks are fast, regular and harsh;
 * play barks are irregular and varied; whines are long, tonal and modulated; isolation barks are
 * sparse and monotone. It is labelled as an estimate in the UI and should stay that way.
 */

export type Mood = 'alert' | 'demand' | 'playful' | 'anxious' | 'bored' | 'distress' | 'quiet';

export type Features = {
  bursts: number;
  meanBurstMs: number;
  longestBurstMs: number;
  meanGapMs: number;
  gapRegularity: number; // 0..1 (1 = metronomic)
  peak: number; // 0..1
  meanLevel: number; // 0..1
  modulation: number; // 0..1 (level wobble inside bursts)
  sustainedRatio: number; // share of bursts > 600ms
  durationMs: number;
};

export type BarkReading = {
  mood: Mood;
  confidence: number;
  title: string;
  meaning: string;
  tryThis: string[];
  features: Features;
  scores: Record<Mood, number>;
};

export const MOOD_COPY: Record<Mood, { title: string; meaning: string; tryThis: string[]; emoji: string }> = {
  alert: {
    emoji: '👀',
    title: 'Alerting you',
    meaning: 'Fast, evenly spaced barks are the classic "something is out there" signal: a delivery, a passing dog, a strange noise.',
    tryThis: ['Calmly check what they noticed, then say "thank you" and redirect.', 'Block the view of the trigger (window film works wonders).', 'Reward quiet after the first bark rather than the barking itself.'],
  },
  demand: {
    emoji: '🍖',
    title: 'Wants something',
    meaning: 'A few deliberate barks with pauses to check your reaction usually means a request: food, the door, the ball, you.',
    tryThis: ['Wait for four seconds of quiet before giving the thing.', 'Teach a polite "ask" like a sit or a nose touch.', 'Check the basics: water, toilet, boredom.'],
  },
  playful: {
    emoji: '🎾',
    title: 'Playful and excited',
    meaning: 'Irregular, bouncy barks with lots of variation in volume are pure excitement. Often paired with a play bow.',
    tryThis: ['Channel it into a game: fetch, tug, a quick training burst.', 'If it is too intense, pause play until all four paws are on the floor.', 'Ten minutes of sniffing on a walk tires a dog more than a sprint.'],
  },
  anxious: {
    emoji: '💭',
    title: 'Anxious or unsettled',
    meaning: 'Long, wavering whines and drawn-out barks point to worry: separation, a storm, an unfamiliar place.',
    tryThis: ['Lower the volume of the world: a quiet room, white noise, a covered crate if they like it.', 'Give a long-lasting chew; licking and chewing are self-soothing.', 'If this happens whenever you leave, talk to a trainer about separation anxiety early.'],
  },
  bored: {
    emoji: '🥱',
    title: 'Bored or lonely',
    meaning: 'Sparse, flat, repetitive barks with long gaps are the sound of a dog with nothing to do.',
    tryThis: ['Swap the food bowl for a puzzle feeder or a snuffle mat.', 'Add a mid-day walk or a dog walker on long days.', 'Rotate toys so something is always "new".'],
  },
  distress: {
    emoji: '🚑',
    title: 'Possible distress',
    meaning: 'Very loud, sudden, sustained vocalising can mean pain or fear. Trust what you see alongside the sound.',
    tryThis: ['Check them over gently: paws, belly, mouth.', 'Look for limping, hiding, or guarding a body part.', 'If it continues or they seem in pain, use the Symptom Checker or call your vet.'],
  },
  quiet: {
    emoji: '😌',
    title: 'Calm, nothing to translate',
    meaning: 'We did not pick up a clear vocalisation. Either a very quiet dog or a very peaceful moment.',
    tryThis: ['Try again holding the phone about a metre from your dog.', 'Record for the full window while they are vocal.', 'Enjoy the silence.'],
  },
};

/** Convert dBFS metering (approximately -160..0) into a 0..1 perceptual level. */
export function dbToLevel(db: number | undefined | null) {
  if (db == null || !Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

export function extractFeatures(levels: number[], intervalMs: number): Features {
  const n = levels.length;
  const durationMs = n * intervalMs;
  if (n < 4) return { bursts: 0, meanBurstMs: 0, longestBurstMs: 0, meanGapMs: 0, gapRegularity: 0, peak: 0, meanLevel: 0, modulation: 0, sustainedRatio: 0, durationMs };

  const sorted = [...levels].sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.2)];
  const peak = sorted[n - 1];
  const meanLevel = levels.reduce((a, b) => a + b, 0) / n;
  const threshold = Math.max(0.35, floor + Math.max(0.12, (peak - floor) * 0.4));

  const bursts: { start: number; end: number; levels: number[] }[] = [];
  let cur: { start: number; end: number; levels: number[] } | null = null;
  levels.forEach((l, i) => {
    if (l >= threshold) {
      if (!cur) cur = { start: i, end: i, levels: [] };
      cur.end = i;
      cur.levels.push(l);
    } else if (cur && i - cur.end > 1) {
      bursts.push(cur);
      cur = null;
    }
  });
  if (cur) bursts.push(cur);

  const burstMs = bursts.map((b) => (b.end - b.start + 1) * intervalMs);
  const gaps = bursts.slice(1).map((b, i) => (b.start - bursts[i].end) * intervalMs);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const cv = (xs: number[]) => {
    if (xs.length < 2) return 1;
    const m = mean(xs);
    if (!m) return 1;
    const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
    return sd / m;
  };
  const modulation = mean(bursts.filter((b) => b.levels.length >= 3).map((b) => cv(b.levels)));

  return {
    bursts: bursts.length,
    meanBurstMs: mean(burstMs),
    longestBurstMs: burstMs.length ? Math.max(...burstMs) : 0,
    meanGapMs: mean(gaps),
    gapRegularity: gaps.length >= 2 ? Math.max(0, 1 - cv(gaps)) : 0,
    peak,
    meanLevel,
    modulation: Math.min(1, modulation),
    sustainedRatio: burstMs.length ? burstMs.filter((ms) => ms > 600).length / burstMs.length : 0,
    durationMs,
  };
}

export function classify(f: Features): BarkReading {
  const scores: Record<Mood, number> = { alert: 0, demand: 0, playful: 0, anxious: 0, bored: 0, distress: 0, quiet: 0 };

  if (f.bursts === 0 || f.peak < 0.3) {
    scores.quiet = 1;
  } else {
    const rate = f.bursts / Math.max(1, f.durationMs / 1000); // bursts per second
    scores.alert = clamp(0.25 * sig(rate, 1.2, 4) + 0.3 * f.gapRegularity + 0.25 * sig(f.peak, 0.7, 12) + 0.2 * (1 - sig(f.meanBurstMs, 500, 0.01)));
    scores.demand = clamp(0.35 * (f.bursts >= 1 && f.bursts <= 4 ? 1 : 0.3) + 0.25 * sig(f.meanGapMs, 900, 0.004) + 0.2 * sig(f.peak, 0.55, 10) + 0.2 * (1 - f.sustainedRatio));
    scores.playful = clamp(0.35 * (1 - f.gapRegularity) + 0.25 * sig(rate, 0.8, 3) + 0.2 * (1 - sig(f.peak, 0.85, 14)) + 0.2 * sig(f.modulation, 0.15, 12));
    scores.anxious = clamp(0.35 * f.sustainedRatio + 0.3 * sig(f.modulation, 0.12, 14) + 0.2 * (1 - sig(f.peak, 0.8, 14)) + 0.15 * sig(f.meanBurstMs, 500, 0.006));
    scores.bored = clamp(0.3 * sig(f.meanGapMs, 1500, 0.003) + 0.25 * (1 - sig(f.modulation, 0.1, 20)) + 0.25 * (1 - sig(f.peak, 0.65, 12)) + 0.2 * (f.bursts >= 2 ? 1 : 0.2));
    scores.distress = clamp(0.4 * sig(f.peak, 0.88, 20) + 0.35 * sig(f.longestBurstMs, 1200, 0.004) + 0.25 * sig(f.meanLevel, 0.55, 10));
  }

  const ranked = (Object.entries(scores) as [Mood, number][]).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const margin = top[1] - (second?.[1] ?? 0);
  const confidence = top[0] === 'quiet' ? 0.6 : clamp(0.45 + margin * 1.6, 0.35, 0.9);
  const copy = MOOD_COPY[top[0]];

  return { mood: top[0], confidence, title: copy.title, meaning: copy.meaning, tryThis: copy.tryThis, features: f, scores };
}

function sig(x: number, mid: number, k: number) {
  return 1 / (1 + Math.exp(-k * (x - mid)));
}
function clamp(x: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}
