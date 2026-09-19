import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';

import { captureWithCamera, extOf, isImagePath, pickFromLibrary, pickVisitFiles, signedVaultUrl, uploadImage, uploadVaultFile } from './media';
import { mimeFromPath } from './readVisitSheet';
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

export type SavedVisit = { storage_path: string; caption: string; isImage: boolean; localUri: string; mime: string };

export async function uploadVetVisit(input: { dogId: string; userId: string; title?: string; from: VisitSource }): Promise<SavedVisit[] | null> {
  const folder = `dogs/${input.dogId}/visits`;
  const items: { localUri: string; mime: string; storage_path: string; fileLabel: string | null }[] = [];

  if (input.from === 'file') {
    const files = await pickVisitFiles();
    if (!files.length) return null;
    for (const file of files) {
      const storage_path = await uploadVaultFile({ bucket: 'vault', userId: input.userId, folder, uri: file.uri, name: file.name, mime: file.mime });
      items.push({ localUri: file.uri, mime: file.mime, storage_path, fileLabel: file.name });
    }
  } else {
    const uri = input.from === 'camera' ? await captureWithCamera([4, 5]) : await pickFromLibrary([4, 5]);
    if (!uri) return null;
    const storage_path = await uploadImage({ bucket: 'vault', userId: input.userId, folder, uri });
    items.push({ localUri: uri, mime: 'image/jpeg', storage_path, fileLabel: null });
  }

  const saved: SavedVisit[] = [];
  for (const item of items) {
    const caption = input.title?.trim() || item.fileLabel || `Visit ${new Date().toLocaleDateString()}`;
    const { error } = await supabase.from('dog_photos').insert({
      dog_id: input.dogId,
      owner_id: input.userId,
      storage_path: item.storage_path,
      caption,
      kind: 'vet_visit',
    });
    if (error) throw error;
    saved.push({
      storage_path: item.storage_path,
      caption,
      isImage: isImagePath(item.storage_path),
      localUri: item.localUri,
      mime: item.mime,
    });
  }
  return saved;
}

/** Download a saved visit so the sheet reader can run again without a new upload. */
export async function materializeVisitForRead(visit: { url: string; storage_path: string }) {
  const ext = extOf(visit.storage_path) || 'bin';
  const dest = `${FileSystem.cacheDirectory}visit-read-${Date.now()}.${ext}`;
  const { uri } = await FileSystem.downloadAsync(visit.url, dest);
  return { uri, path: visit.storage_path, mime: mimeFromPath(visit.storage_path) };
}

export function askVetVisitSource(onPick: (from: VisitSource) => void) {
  Alert.alert('Upload a photo', 'Visit summary or vaccine card. Files use the File button.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Take a photo', onPress: () => onPick('camera') },
    { text: 'From photos', onPress: () => onPick('library') },
  ]);
}
