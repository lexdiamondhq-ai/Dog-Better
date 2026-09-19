import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ADD_DOG_HREF, useDogs } from './dogs';
import { useEntitlements } from './entitlements';

/**
 * The Premium gates the paywall promises, in one place so screens cannot drift from the copy.
 * Product rule: the first dog, records, emergency, the care sheet, visit-sheet med reads, and community are never gated.
 */

export type GatedFeature = 'multi_dog' | 'clinic_pack' | 'look' | 'learn_library';

export function usePremiumGate() {
  const router = useRouter();
  const { isPremium } = useEntitlements();
  const { dogs } = useDogs();

  const allows = useCallback(
    (feature: GatedFeature) => {
      if (isPremium) return true;
      if (feature === 'multi_dog') return dogs.length === 0;
      return false;
    },
    [isPremium, dogs.length],
  );

  /** Returns true if the caller may proceed; otherwise routes to the paywall and returns false. */
  const require = useCallback(
    (feature: GatedFeature) => {
      if (allows(feature)) return true;
      router.push({ pathname: '/paywall', params: { from: feature } });
      return false;
    },
    [allows, router],
  );

  const openAddDog = useCallback(() => {
    if (require('multi_dog')) router.push(ADD_DOG_HREF);
  }, [require, router]);

  return { isPremium, allows, require, openAddDog };
}
