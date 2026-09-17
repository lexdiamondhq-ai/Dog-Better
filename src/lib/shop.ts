import type { Dog } from '@/lib/database.types';
import { AMAZON_APP_APPROVED, AMAZON_TAG, SHOP_LINKS, type ShopLink } from '@/content/partners';

/** Amazon search for a query. The Associates tag rides along only once the app is an Approved Mobile Application. */
export function amazonSearch(query: string) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  return AMAZON_APP_APPROVED ? `${base}&tag=${AMAZON_TAG}` : base;
}

export function sizeBand(weightKg: number | null | undefined): ShopLink['size'] {
  if (weightKg == null || !Number.isFinite(Number(weightKg))) return 'any';
  const kg = Number(weightKg);
  if (kg < 9) return 'small';
  if (kg < 23) return 'medium';
  return 'large';
}

/** Links that fit this dog. Size-specific gear first, then general kit. */
export function shopForDog(dog: Dog | null): ShopLink[] {
  const size = sizeBand(dog?.weight_kg);
  const breed = dog?.breed?.trim();
  const sized = SHOP_LINKS.filter((l) => l.size === 'any' || l.size === size);
  if (!breed || breed.toLowerCase() === 'mixed breed') return sized;
  return [
    {
      id: 'breed-food',
      category: 'food',
      title: `${breed} food`,
      why: `Recipes people buy for ${breed}s. Still check the label for ${dog?.name ?? 'your dog'}.`,
      query: `${breed} dog food`,
      size: 'any',
    },
    ...sized,
  ];
}
