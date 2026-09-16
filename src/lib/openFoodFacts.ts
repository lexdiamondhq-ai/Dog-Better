export type Product = {
  barcode: string;
  name: string | null;
  brand: string | null;
  ingredientsText: string | null;
  kcalPer100g: number | null;
  image: string | null;
};

const FIELDS = 'product_name,product_name_en,brands,ingredients_text,ingredients_text_en,nutriments,image_front_small_url';

const HOSTS = [
  'https://world.openfoodfacts.org',
  'https://world.openpetfoodfacts.org',
  'https://us.openfoodfacts.org',
  'https://us.openpetfoodfacts.org',
];

/** UPC-A is 12 digits; Open Food Facts usually stores the EAN-13 with a leading 0. */
export function barcodeVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [];
  const out = new Set<string>([digits]);
  if (digits.length === 12) out.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith('0')) out.add(digits.slice(1));
  if (digits.length === 8) out.add(digits.padStart(13, '0'));
  return [...out];
}

type OffJson = {
  status?: number | string;
  product?: {
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    nutriments?: { 'energy-kcal_100g'?: number; 'energy-kcal'?: number };
    image_front_small_url?: string;
  };
};

function parseProduct(code: string, json: OffJson): Product | null {
  const found = json.status === 1 || json.status === '1' || json.status === 'success';
  if (!found || !json.product) return null;
  const p = json.product;
  const name = p.product_name_en || p.product_name || null;
  const ingredients = p.ingredients_text_en || p.ingredients_text || null;
  if (!name && !ingredients) return null;
  const kcal = p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.['energy-kcal'] ?? null;
  return {
    barcode: code,
    name,
    brand: p.brands?.split(',')[0]?.trim() || null,
    ingredientsText: ingredients,
    kcalPer100g: typeof kcal === 'number' && kcal > 0 ? kcal : null,
    image: p.image_front_small_url ?? null,
  };
}

async function fetchProduct(host: string, code: string, signal: AbortSignal): Promise<Product | null> {
  const url = `${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json', 'User-Agent': 'DogBetter/1.0 (ios; treat-scanner; https://dogbetter.app)' },
  });
  if (!res.ok) return null;
  return parseProduct(code, (await res.json()) as OffJson);
}

/** Open Food Facts plus Open Pet Food Facts. Treat bags are often only on the pet catalog. */
export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const codes = barcodeVariants(barcode);
  if (!codes.length) return null;

  const ac = new AbortController();
  const kill = setTimeout(() => ac.abort(), 9000);
  try {
    const jobs = HOSTS.flatMap((host) => codes.map((code) => fetchProduct(host, code, ac.signal)));
    const hits = await Promise.allSettled(jobs);
    for (const hit of hits) {
      if (hit.status === 'fulfilled' && hit.value) {
        ac.abort();
        return hit.value;
      }
    }
    return null;
  } finally {
    clearTimeout(kill);
  }
}
