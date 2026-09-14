import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { DogPhoto } from './database.types';
import { signedVaultUrl } from './media';
import { supabase } from './supabase';

export type VaultPhoto = DogPhoto & { url: string };

/** Private photos live in the `vault` bucket; every render needs a fresh signed URL. */
export function useVaultPhotos(dogId: string | undefined) {
  const [photos, setPhotos] = useState<VaultPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!dogId) return;
    const { data } = await supabase.from('dog_photos').select('*').eq('dog_id', dogId).order('created_at', { ascending: false }).limit(60);
    const rows = data ?? [];
    const urls = await Promise.all(rows.map((r) => signedVaultUrl(r.storage_path).catch(() => null)));
    setPhotos(rows.flatMap((r, i) => (urls[i] ? [{ ...r, url: urls[i] as string }] : [])));
    setLoading(false);
  }, [dogId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { photos, loading, reload: load };
}
