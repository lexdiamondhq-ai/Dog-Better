import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from './supabase';

/**
 * "Let users export everything" is a product rule, not a feature. One JSON file with every row the
 * user owns, written locally and handed to the share sheet. No server round trip, no email, no wait.
 */
export async function exportAllData(userId: string, email: string | undefined) {
  const [dogs, meals, health, weights, scans, photos, pulses] = await Promise.all([
    supabase.from('dogs').select('*').eq('owner_id', userId),
    supabase.from('meals').select('*').eq('owner_id', userId),
    supabase.from('health_logs').select('*').eq('owner_id', userId),
    supabase.from('weight_entries').select('*').eq('owner_id', userId),
    supabase.from('food_scans').select('*').eq('owner_id', userId),
    supabase.from('dog_photos').select('*').eq('owner_id', userId),
    supabase.from('place_pulses').select('*').eq('user_id', userId),
  ]);
  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: userId, email: email ?? null },
    dogs: dogs.data ?? [],
    meals: meals.data ?? [],
    health_logs: health.data ?? [],
    weight_entries: weights.data ?? [],
    food_scans: scans.data ?? [],
    dog_photos: photos.data ?? [],
    place_pulses: pulses.data ?? [],
    note: 'Photos are referenced by storage path. Request full media export from support if you need the files.',
  };
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create();
  const file = new File(dir, `dog-better-export-${new Date().toISOString().slice(0, 10)}.json`);
  file.write(JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Your Dog Better data' });
  return file.uri;
}

/** A file the clinic can keep. HTML so they can print to PDF from Files or Mail. */
export async function shareClinicFile(dogName: string, body: string) {
  const dir = new Directory(Paths.cache, 'clinic');
  if (!dir.exists) dir.create();
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(dir, `${dogName.replace(/[^\w]+/g, '-').toLowerCase()}-clinic-pack-${stamp}.html`);
  const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  file.write(`<!doctype html><html><head><meta charset="utf-8"><title>${dogName} clinic pack</title>
<style>body{font:15px/1.45 -apple-system,Menlo,monospace;max-width:40rem;margin:2rem auto;padding:0 1rem;white-space:pre-wrap;color:#24160F}</style>
</head><body>${escaped}</body></html>`);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/html', dialogTitle: `${dogName} clinic pack` });
  }
  return file.uri;
}
