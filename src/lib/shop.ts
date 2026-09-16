import type { Dog } from '@/lib/database.types';
import { AMAZON_TAG, SHOP_LINKS, type ShopLink } from '@/content/partners';

export function amazonSearch(query: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
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
