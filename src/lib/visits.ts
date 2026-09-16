import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { captureWithCamera, isImagePath, pickFromLibrary, pickVisitFile, signedVaultUrl, uploadImage, uploadVaultFile } from './media';
import { supabase } from './supabase';
import type { VaultPhoto } from './vault';

export type VisitSource = 'camera' | 'library' | 'file';

export function useVetVisits(dogId: string | undefined) {
  const [visits, setVisits] = useState<VaultPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!dogId) return;
    const { data } = await supabase.from('dog_photos').select('*').eq('dog_id', dogId).eq('kind', 'vet_visit').order('created_at', { ascending: false }).limit(40);
    const rows = data ?? [];
    const urls = await Promise.all(rows.map((r) => signedVaultUrl(r.storage_path).catch(() => null)));
    setVisits(rows.flatMap((r, i) => (urls[i] ? [{ ...r, url: urls[i] as string }] : [])));
    setLoading(false);
  }, [dogId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { visits, loading, reload: load };
}

export async function uploadVetVisit(input: { dogId: string; userId: string; title?: string; from: VisitSource }) {
  const folder = `dogs/${input.dogId}/visits`;
  let storage_path: string;
  let fileLabel: string | null = null;
  let localUri: string;

  if (input.from === 'file') {
    const file = await pickVisitFile();
    if (!file) return null;
    localUri = file.uri;
    storage_path = await uploadVaultFile({ bucket: 'vault', userId: input.userId, folder, uri: file.uri, name: file.name, mime: file.mime });
    fileLabel = file.name;
  } else {
    const uri = input.from === 'camera' ? await captureWithCamera([4, 5]) : await pickFromLibrary([4, 5]);
    if (!uri) return null;
    localUri = uri;
    storage_path = await uploadImage({ bucket: 'vault', userId: input.userId, folder, uri });
  }

  const caption = input.title?.trim() || fileLabel || `Vet visit ${new Date().toLocaleDateString()}`;
  const { error } = await supabase.from('dog_photos').insert({
    dog_id: input.dogId,
    owner_id: input.userId,
    storage_path,
    caption,
    kind: 'vet_visit',
  });
  if (error) throw error;
  return { storage_path, caption, isImage: isImagePath(storage_path), localUri };
}

export function askVetVisitSource(onPick: (from: VisitSource) => void) {
  Alert.alert('Upload a photo', 'Visit summary or vaccine card. Files use the File button.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Take a photo', onPress: () => onPick('camera') },
    { text: 'From photos', onPress: () => onPick('library') },
  ]);
}
