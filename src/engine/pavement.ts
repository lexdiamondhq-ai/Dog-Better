export type Ground = 'asphalt' | 'concrete' | 'grass';
export type PavementVerdict = 'safe' | 'watch' | 'unsafe';

export type Pavement = {
  airF: number;
  cloudPct: number | null;
  uv: number | null;
  asphaltF: number;
  concreteF: number;
  grassF: number;
  verdict: PavementVerdict;
  coolsAt: string | null;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Solar load 0-1 from UV and cloud. Night and heavy overcast collapse toward zero. */
export function solarLoad(uv: number | null, cloudPct: number | null, hour: number) {
  const night = hour < 7 || hour >= 19;
  if (night) return 0;
  const uvN = uv == null ? (hour >= 10 && hour <= 16 ? 6 : 3) : uv;
  const cloud = cloudPct == null ? 30 : cloudPct;
  return clamp((uvN / 10) * (1 - cloud / 100), 0, 1);
}

export function surfaceF(airF: number, ground: Ground, solar: number) {
  const add = { asphalt: 50, concrete: 36, grass: 8 }[ground] * solar;
  return Math.round(airF + add);
}

export function pavementVerdict(asphaltF: number): PavementVerdict {
  if (asphaltF >= 125) return 'unsafe';
  if (asphaltF >= 110) return 'watch';
  return 'safe';
}

export function estimatePavement(input: {
  airF: number;
  cloudPct?: number | null;
  uv?: number | null;
  hour?: number;
  hourly?: { hour: number; airF: number; cloudPct: number | null; uv: number | null }[];
}): Pavement {
  const hour = input.hour ?? new Date().getHours();
  const solar = solarLoad(input.uv ?? null, input.cloudPct ?? null, hour);
  const asphaltF = surfaceF(input.airF, 'asphalt', solar);
  const concreteF = surfaceF(input.airF, 'concrete', solar);
  const grassF = surfaceF(input.airF, 'grass', solar);
  let coolsAt: string | null = null;
  if (input.hourly) {
    const next = input.hourly.find((h) => h.hour > hour && surfaceF(h.airF, 'asphalt', solarLoad(h.uv, h.cloudPct, h.hour)) < 120);
    if (next) {
      const suffix = next.hour >= 12 ? 'p' : 'a';
      const hr = next.hour % 12 || 12;
      coolsAt = `${hr}${suffix}`;
    }
  }
  return {
    airF: Math.round(input.airF),
    cloudPct: input.cloudPct ?? null,
    uv: input.uv ?? null,
    asphaltF,
    concreteF,
    grassF,
    verdict: pavementVerdict(asphaltF),
    coolsAt,
  };
}
