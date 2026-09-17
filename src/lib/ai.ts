import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';

/**
 * Client side of the `ai` Edge Function. The model key never leaves the server; this file only
 * shrinks the photo and forwards it. Every response says where the answer came from so screens
 * can label it honestly.
 */

export type AiSource = 'ai' | 'local';
export type AiReason = 'quota' | 'premium_required' | 'not_configured' | 'model_error' | 'offline' | 'image_too_large';

export type AiResponse<T> = { ok: true; source: 'ai'; result: T } | { ok: false; source: 'local'; reason: AiReason };

const MAX_EDGE = 1280;

/** Downscale to a phone-screen sized JPEG so the payload stays well under the server cap. */
export async function photoToBase64(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: MAX_EDGE });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.78, format: SaveFormat.JPEG, base64: true });
  image.release();
  ctx.release();
  if (!saved.base64) throw new Error('encode_failed');
  return saved.base64;
}

type Body =
  | { kind: 'look'; prompt: string; dogLine: string; allergies: string[]; imageBase64: string }
  | { kind: 'sheet'; dogLine: string; text?: string; imageBase64?: string };

export async function callAi<T>(body: Body): Promise<AiResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; source?: AiSource; result?: T; reason?: AiReason; error?: string }>('ai', {
      method: 'POST',
      body,
    });
    if (error) {
      // functions-js throws FunctionsHttpError for non-2xx; the body still carries our reason.
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        try {
          const parsed = (await ctx.json()) as { reason?: AiReason; error?: string };
          if (parsed.reason) return { ok: false, source: 'local', reason: parsed.reason };
          if (parsed.error === 'image_too_large') return { ok: false, source: 'local', reason: 'image_too_large' };
        } catch {
          /* fall through */
        }
      }
      return { ok: false, source: 'local', reason: 'model_error' };
    }
    if (data?.ok && data.result) return { ok: true, source: 'ai', result: data.result };
    return { ok: false, source: 'local', reason: data?.reason ?? 'model_error' };
  } catch {
    return { ok: false, source: 'local', reason: 'offline' };
  }
}
