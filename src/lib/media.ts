import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export type Bucket = 'media' | 'vault';

export type PickedFile = { uri: string; name: string; mime: string };

const IMAGE_EXT = /^(jpe?g|png|gif|webp|heic)$/i;

export function extOf(path: string) {
  const m = path.split('?')[0].match(/\.([a-z0-9]+)$/i);
  return m?.[1]?.toLowerCase() ?? '';
}

export function isImagePath(path: string) {
  return IMAGE_EXT.test(extOf(path));
}

function extFromFile(name: string, mime: string) {
  const fromName = extOf(name);
  if (fromName) return fromName;
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('wordprocessingml') || mime === 'application/msword') return mime.includes('wordprocessingml') ? 'docx' : 'doc';
  if (mime.startsWith('image/')) return mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
  return 'bin';
}

/** Uploads a local image URI into `{bucket}/{userId}/{folder}/{timestamp}.jpg` and returns the storage path. */
export async function uploadImage(opts: { bucket: Bucket; userId: string; folder: string; uri: string }) {
  return uploadVaultFile({ bucket: opts.bucket, userId: opts.userId, folder: opts.folder, uri: opts.uri, name: 'photo.jpg', mime: 'image/jpeg' });
}

export async function uploadVaultFile(opts: { bucket: Bucket; userId: string; folder: string; uri: string; name: string; mime: string }) {
  const bytes = await readLocalBytes(opts.uri);
  const ext = extFromFile(opts.name, opts.mime);
  const path = `${opts.userId}/${opts.folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(opts.bucket).upload(path, bytes, { contentType: opts.mime || 'application/octet-stream', upsert: false });
  if (error) throw error;
  return path;
}

export async function pickVisitFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, name: asset.name ?? 'visit.pdf', mime: asset.mimeType ?? 'application/octet-stream' };
}

export async function signedVaultUrl(path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from('vault').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * PHPicker itself does not need library permission. The crop editor (`allowsEditing`) does, and it
 * also crashes Expo Go on some photos, so we skip it and ask for a compatible JPEG copy instead.
 */
export async function pickFromLibrary(_aspect: [number, number] = [1, 1]) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.82,
    exif: false,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode?.Compatible ?? 'compatible',
  });
  if (result.canceled) return null;
  const uri = result.assets[0]?.uri;
  if (!uri) return null;
  return uri;
}

/** Pick a new profile picture, upload it, and point the dog at it. Returns the new public URL, or null if cancelled. */
export async function changeDogPhoto(dogId: string, userId: string) {
  const uri = await pickFromLibrary([1, 1]);
  if (!uri) return null;
  const path = await uploadImage({ bucket: 'media', userId, folder: 'avatars', uri });
  const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('dogs').update({ avatar_url: url }).eq('id', dogId);
  if (error) throw error;
  return url;
}

export async function captureWithCamera(_aspect: [number, number] = [4, 5]) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.82,
    exif: false,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

async function readLocalBytes(uri: string): Promise<Uint8Array> {
  try {
    const buf = await new File(uri).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    // Image picker URIs are sometimes not real files. The legacy reader still accepts them.
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return decodeBase64(b64);
  }
}

function decodeBase64(b64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = alphabet.indexOf(clean[i + 2]);
    const d = alphabet.indexOf(clean[i + 3]);
    out[o++] = (a << 2) | (b >> 4);
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}
