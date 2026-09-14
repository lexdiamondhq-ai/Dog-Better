export type Product = {
  barcode: string;
  name: string | null;
  brand: string | null;
  ingredientsText: string | null;
  kcalPer100g: number | null;
  image: string | null;
};

const FIELDS = 'product_name,product_name_en,brands,ingredients_text,ingredients_text_en,nutriments,image_front_small_url';

/** Open Food Facts is a free, open database of 3M+ packaged foods. No key needed. */
export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
    headers: { 'User-Agent': 'DogBetter/1.0 (mobile app)' },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    status: number;
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
  if (json.status !== 1 || !json.product) return null;
  const p = json.product;
  const kcal = p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.['energy-kcal'] ?? null;
  return {
    barcode,
    name: p.product_name_en || p.product_name || null,
    brand: p.brands?.split(',')[0]?.trim() || null,
    ingredientsText: p.ingredients_text_en || p.ingredients_text || null,
    kcalPer100g: typeof kcal === 'number' && kcal > 0 ? kcal : null,
    image: p.image_front_small_url ?? null,
  };
}
