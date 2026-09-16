import type { Place, PlacePulse } from './database.types';
import { supabase } from './supabase';

export type PlaceKind = 'dog_park' | 'trail' | 'patio' | 'beach' | 'other';

export const KIND_META: Record<PlaceKind, { label: string; plural: string }> = {
  dog_park: { label: 'Dog park', plural: 'Dog parks' },
  trail: { label: 'Trail', plural: 'Trails' },
  patio: { label: 'Patio', plural: 'Patios' },
  beach: { label: 'Beach', plural: 'Beaches' },
  other: { label: 'Park', plural: 'Parks' },
};

export const CROWD = [
  { id: 'empty', label: 'Empty' },
  { id: 'light', label: 'A few dogs' },
  { id: 'busy', label: 'Busy' },
  { id: 'packed', label: 'Packed' },
] as const;

export const GROUND = [
  { id: 'dry', label: 'Dry' },
  { id: 'wet', label: 'Wet' },
  { id: 'muddy', label: 'Muddy' },
  { id: 'icy', label: 'Icy' },
] as const;

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Public Overpass instances rate-limit aggressively and answer with an HTML error page on
// a 200, so we try the mirrors in order and treat anything that is not JSON as a failure.
const OVERPASS_MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const DOG_OK = 'yes|leashed|unleashed|outside';

type OsmPlace = Omit<Place, 'id' | 'created_at' | 'created_by'>;

async function overpassElements(query: string, ms = 9000): Promise<OsmElement[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const elements = await Promise.any(
      OVERPASS_MIRRORS.map(async (url) => {
        const res = await fetch(url, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'DogBetter/1.0 (mobile app)' },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        const text = await res.text();
        if (!text.trimStart().startsWith('{')) throw new Error('Overpass returned a non-JSON response');
        return (JSON.parse(text) as { elements: OsmElement[] }).elements;
      }),
    );
    ctrl.abort();
    return elements;
  } finally {
    clearTimeout(timer);
  }
}

/** Pulls dog-friendly places from OpenStreetMap within `radiusM` of a point. Throws if every mirror fails. */
export async function fetchOsmPlaces(lat: number, lng: number, radiusM = 5000): Promise<OsmPlace[]> {
  const q = `[out:json][timeout:12];
(
  nwr["leisure"="dog_park"](around:${radiusM},${lat},${lng});
  nwr["amenity"~"cafe|restaurant|bar|pub|biergarten"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
  nwr["highway"~"path|footway|track|bridleway"]["name"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
  nwr["leisure"="park"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
  nwr["natural"="beach"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
);
out center tags;`;
  return normalizeOsm(await overpassElements(q), lat, lng);
}

export const WALK_PLACE_KINDS: PlaceKind[] = ['dog_park', 'trail', 'other', 'beach'];

type WalkSpotMem = { lat: number; lng: number; at: number; places: OsmPlace[] };
let walkSpotMem: WalkSpotMem | null = null;

function nearestOf(places: OsmPlace[], lat: number, lng: number, n: number) {
  return [...places].sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng)).slice(0, n);
}

/** Parks, dog areas, and trails as two small Overpass calls so a slow trail search cannot starve parks. */
export async function fetchOsmWalkSpots(lat: number, lng: number, radiusM = 6000): Promise<OsmPlace[]> {
  if (walkSpotMem && Date.now() - walkSpotMem.at < 15 * 60_000 && haversineKm(lat, lng, walkSpotMem.lat, walkSpotMem.lng) < 1.2 && walkSpotMem.places.some((p) => p.kind === 'other' || p.kind === 'trail')) {
    return walkSpotMem.places;
  }

  const areasQ = `[out:json][timeout:12];
(
  node["leisure"="dog_park"](around:${radiusM},${lat},${lng});
  way["leisure"="dog_park"](around:${radiusM},${lat},${lng});
  node["leisure"="park"]["name"](around:${radiusM},${lat},${lng});
  way["leisure"="park"]["name"](around:${radiusM},${lat},${lng});
  way["leisure"="recreation_ground"]["name"](around:${radiusM},${lat},${lng});
  way["leisure"="nature_reserve"]["name"](around:${radiusM},${lat},${lng});
  node["natural"="beach"]["name"](around:${radiusM},${lat},${lng});
  way["natural"="beach"]["name"](around:${radiusM},${lat},${lng});
);
out center tags;`;

  const trailsQ = `[out:json][timeout:12];
(
  way["highway"="path"]["name"](around:${radiusM},${lat},${lng});
  way["highway"="bridleway"]["name"](around:${radiusM},${lat},${lng});
  way["highway"="track"]["name"]["foot"!="no"](around:${radiusM},${lat},${lng});
  way["highway"="footway"]["name"]["footway"!="sidewalk"]["footway"!="crossing"](around:${radiusM},${lat},${lng});
);
out center tags;`;

  const [areaEls, trailEls] = await Promise.all([
    overpassElements(areasQ, 10000).catch(() => [] as OsmElement[]),
    overpassElements(trailsQ, 10000).catch(() => [] as OsmElement[]),
  ]);

  const areas = normalizeOsm(areaEls, lat, lng).filter((p) => p.kind !== 'patio');
  const trails = normalizeOsm(trailEls, lat, lng).filter((p) => p.kind === 'trail');
  const places = [
    ...nearestOf(
      areas.filter((p) => p.kind === 'dog_park'),
      lat,
      lng,
      15,
    ),
    ...nearestOf(
      areas.filter((p) => p.kind === 'other' || p.kind === 'beach'),
      lat,
      lng,
      24,
    ),
    ...nearestOf(trails, lat, lng, 24),
  ];
  const byKey = new Map(places.map((p) => [`${p.kind}:${p.osm_id ?? p.name}`, p]));
  const list = Array.from(byKey.values()).sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng));
  walkSpotMem = { lat, lng, at: Date.now(), places: list };
  return list;
}

function normalizeOsm(elements: OsmElement[], lat: number, lng: number): OsmPlace[] {
  const out: OsmPlace[] = [];
  // Long trails are mapped as dozens of short ways sharing one name; keep only the segment nearest the user.
  const byName = new Map<string, { place: OsmPlace; km: number }>();

  for (const el of elements) {
    const plat = el.lat ?? el.center?.lat;
    const plng = el.lon ?? el.center?.lon;
    if (plat == null || plng == null) continue;
    const tags = el.tags ?? {};
    // Apartment and members-only dog runs are not places anyone can walk into.
    if (tags.access === 'private' || tags.access === 'no' || tags.access === 'customers') continue;

    let kind: PlaceKind = 'other';
    if (tags.leisure === 'dog_park') kind = 'dog_park';
    else if (tags.amenity) kind = 'patio';
    else if (tags.highway) kind = 'trail';
    else if (tags.natural === 'beach') kind = 'beach';

    if (tags.name) {
      const key = `${kind}:${tags.name.toLowerCase()}`;
      const km = haversineKm(lat, lng, plat, plng);
      const prev = byName.get(key);
      if (!prev || km < prev.km) byName.set(key, { place: { osm_id: el.id, name: tags.name, kind, lat: plat, lng: plng }, km });
    } else {
      const name = kind === 'dog_park' ? 'Dog park' : kind === 'patio' ? 'Dog-friendly patio' : kind === 'trail' ? 'Trail' : kind === 'beach' ? 'Beach' : 'Park';
      out.push({ osm_id: el.id, name, kind, lat: plat, lng: plng });
    }
  }
  for (const { place } of byName.values()) out.push(place);
  return out;
}

/** Ensures the OSM places exist in Supabase (insert-only, RLS forbids edits) and returns the DB rows. */
export async function syncPlaces(osm: Omit<Place, 'id' | 'created_at' | 'created_by'>[], userId: string): Promise<Place[]> {
  const ids = osm.map((p) => p.osm_id).filter((x): x is number => x != null);
  if (ids.length === 0) return [];
  const { data: existing } = await supabase.from('places').select('*').in('osm_id', ids);
  const have = new Set((existing ?? []).map((p) => p.osm_id));
  const missing = osm.filter((p) => !have.has(p.osm_id)).map((p) => ({ ...p, created_by: userId }));
  let inserted: Place[] = [];
  if (missing.length) {
    const { data } = await supabase.from('places').insert(missing).select();
    inserted = data ?? [];
  }
  return [...(existing ?? []), ...inserted];
}

export async function fetchNearbyDbPlaces(lat: number, lng: number, radiusM = 8000): Promise<Place[]> {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const { data } = await supabase
    .from('places')
    .select('*')
    .gte('lat', lat - dLat)
    .lte('lat', lat + dLat)
    .gte('lng', lng - dLng)
    .lte('lng', lng + dLng)
    .limit(200);
  return data ?? [];
}

export type PulseConfidence = 'low' | 'medium' | 'high';
export type PulseSummary = { crowd: string; ground: string; shade: boolean; at: string; count: number; confidence: PulseConfidence };

/**
 * Latest pulse per place within the last 12 hours. Crowd data is thin by nature, so every summary
 * carries a confidence level derived from how many people reported and how recently, and the UI
 * always shows the timestamp next to it. One report from five hours ago is a hint, not a fact.
 */
export async function fetchPulseSummaries(placeIds: string[], now = Date.now()): Promise<Record<string, PulseSummary>> {
  if (placeIds.length === 0) return {};
  const since = new Date(now - 12 * 3600_000).toISOString();
  const { data } = await supabase.from('place_pulses').select('*').in('place_id', placeIds).gte('created_at', since).order('created_at', { ascending: false });
  const out: Record<string, PulseSummary> = {};
  for (const p of (data ?? []) as PlacePulse[]) {
    if (!out[p.place_id]) out[p.place_id] = { crowd: p.crowd, ground: p.ground, shade: p.shade, at: p.created_at, count: 1, confidence: 'low' };
    else out[p.place_id].count += 1;
  }
  for (const s of Object.values(out)) s.confidence = pulseConfidence(s.count, now - new Date(s.at).getTime());
  return out;
}

export function pulseConfidence(reports: number, ageMs: number): PulseConfidence {
  const hours = ageMs / 3600_000;
  if (reports >= 3 && hours <= 2) return 'high';
  if (reports >= 2 || hours <= 1) return 'medium';
  return 'low';
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
