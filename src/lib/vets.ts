export type VetHit = {
  name: string;
  phone: string | null;
  address: string | null;
  lat: number;
  lng: number;
  km: number;
};

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(x)));
}

export async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DogBetter/1.0 (vet search)', Accept: 'application/json' } });
  if (!res.ok) throw new Error('Could not look up that place.');
  const data = (await res.json()) as { lat: string; lon: string }[];
  if (!data[0]) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

export async function searchVetsNear(lat: number, lng: number, radiusM = 16000): Promise<VetHit[]> {
  const q = `[out:json][timeout:25];
(
  nwr["amenity"="veterinary"](around:${radiusM},${lat},${lng});
  nwr["healthcare"="veterinary"](around:${radiusM},${lat},${lng});
);
out center tags;`;

  let last: unknown = null;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'DogBetter/1.0 (vet search)' },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const text = await res.text();
      if (!text.trimStart().startsWith('{')) throw new Error('Overpass returned a non-JSON response');
      const json = JSON.parse(text) as { elements: OsmElement[] };
      return normalize(json.elements, { lat, lng });
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error('Could not reach the map.');
}

function normalize(elements: OsmElement[], origin: { lat: number; lng: number }): VetHit[] {
  const seen = new Set<string>();
  const out: VetHit[] = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (lat == null || lng == null || !name) continue;
    const key = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean);
    out.push({
      name,
      phone: phoneFromTags(tags),
      address: parts.length ? parts.join(' ') : (tags['addr:full'] ?? null),
      lat,
      lng,
      km: kmBetween(origin, { lat, lng }),
    });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, 12);
}

function phoneFromTags(tags: Record<string, string>): string | null {
  const raw = tags.phone ?? tags['contact:phone'] ?? tags.telephone ?? tags['contact:mobile'] ?? tags.mobile ?? tags['phone:mobile'];
  return raw?.trim() || null;
}

/** OSM often omits phone on the first pass. Nominatim extratags usually has the clinic line. */
export async function fillVetPhone(hit: VetHit): Promise<VetHit> {
  if (hit.phone) return hit;
  try {
    const q = `${hit.name} veterinary`;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&extratags=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DogBetter/1.0 (vet search)', Accept: 'application/json' } });
    if (!res.ok) return hit;
    const rows = (await res.json()) as { lat: string; lon: string; extratags?: Record<string, string> }[];
    const close = rows
      .map((r) => ({
        km: kmBetween(hit, { lat: Number(r.lat), lng: Number(r.lon) }),
        phone: r.extratags ? phoneFromTags(r.extratags) : null,
      }))
      .filter((r) => r.phone && r.km < 4)
      .sort((a, b) => a.km - b.km)[0];
    return close?.phone ? { ...hit, phone: close.phone } : hit;
  } catch {
    return hit;
  }
}
