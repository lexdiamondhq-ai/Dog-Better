import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export type Bucket = 'media' | 'vault';

/** Uploads a local image URI into `{bucket}/{userId}/{folder}/{timestamp}.jpg` and returns the storage path. */
export async function uploadImage(opts: { bucket: Bucket; userId: string; folder: string; uri: string }) {
  const bytes = await new File(opts.uri).arrayBuffer();
  const path = `${opts.userId}/${opts.folder}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(opts.bucket).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function signedVaultUrl(path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from('vault').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function pickFromLibrary(aspect: [number, number] = [1, 1]) {
  // No permission request on purpose: the system picker (PHPicker on iOS, Photo Picker on Android)
  // runs out of process and only hands back the photos the user chose, so full-library access is never needed.
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.82 });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export async function captureWithCamera(aspect: [number, number] = [4, 5]) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.82 });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
