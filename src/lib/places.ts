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

/** Pulls dog-friendly places from OpenStreetMap within `radiusM` of a point. Throws if every mirror fails. */
export async function fetchOsmPlaces(lat: number, lng: number, radiusM = 5000): Promise<OsmPlace[]> {
  const q = `[out:json][timeout:25];
(
  nwr["leisure"="dog_park"](around:${radiusM},${lat},${lng});
  nwr["amenity"~"cafe|restaurant|bar|pub|biergarten"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
  nwr["highway"~"path|footway|track|bridleway"]["name"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
  nwr["leisure"="park"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
  nwr["natural"="beach"]["dog"~"${DOG_OK}"](around:${radiusM},${lat},${lng});
);
out center tags;`;

  let lastError: unknown = null;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'DogBetter/1.0 (mobile app)' },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const text = await res.text();
      if (!text.trimStart().startsWith('{')) throw new Error('Overpass returned a non-JSON response');
      const json = JSON.parse(text) as { elements: OsmElement[] };
      return normalizeOsm(json.elements, lat, lng);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not reach OpenStreetMap');
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

export type PulseSummary = { crowd: string; ground: string; shade: boolean; at: string; count: number };

/** Latest pulse per place within the last 12 hours (anything older is stale for crowd levels). */
export async function fetchPulseSummaries(placeIds: string[]): Promise<Record<string, PulseSummary>> {
  if (placeIds.length === 0) return {};
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data } = await supabase.from('place_pulses').select('*').in('place_id', placeIds).gte('created_at', since).order('created_at', { ascending: false });
  const out: Record<string, PulseSummary> = {};
  for (const p of (data ?? []) as PlacePulse[]) {
    if (!out[p.place_id]) out[p.place_id] = { crowd: p.crowd, ground: p.ground, shade: p.shade, at: p.created_at, count: 1 };
    else out[p.place_id].count += 1;
  }
  return out;
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
