import * as FileSystem from 'expo-file-system/legacy';

import { localReadSheet, normalizeSheetRead, type SheetRead } from '@/engine/sheetMeds';

import { callAi, photoToBase64 } from './ai';
import type { Dog } from './database.types';
import { isImagePath } from './media';

function dogLine(dog: Dog | null) {
  if (!dog) return 'this dog';
  return [dog.name, dog.breed].filter(Boolean).join(', ');
}

type ModelSheet = { medications?: SheetRead['medications']; meals?: SheetRead['meals'] };

/**
 * Read a visit photo or a text file for medications and meal times. The model runs on the server
 * (Premium only, enforced there). Plain text still gets the conservative local parser when the model
 * is unavailable. Photos of PDFs are the supported path for PDFs: the client never parses binaries.
 */
export async function readVisitSheet(input: { uri?: string | null; path?: string; text?: string; dog: Dog | null }): Promise<SheetRead> {
  const who = dogLine(input.dog);

  if (input.text) {
    const ai = await callAi<ModelSheet>({ kind: 'sheet', dogLine: who, text: input.text });
    return ai.ok ? normalizeSheetRead(ai.result, 'ai') : localReadSheet(input.text, 'local');
  }

  const path = input.path ?? input.uri ?? '';
  if (input.uri && isImagePath(path)) {
    try {
      const imageBase64 = await photoToBase64(input.uri);
      const ai = await callAi<ModelSheet>({ kind: 'sheet', dogLine: who, imageBase64 });
      if (ai.ok) return normalizeSheetRead(ai.result, 'ai');
    } catch {
      /* fall through to not found */
    }
    return { medications: [], meals: [], found: false, source: 'local' };
  }

  if (input.uri && /\.(txt|md|csv)$/i.test(path)) {
    try {
      const text = await FileSystem.readAsStringAsync(input.uri);
      if (text && !text.includes('\u0000') && text.length < 40_000) {
        const ai = await callAi<ModelSheet>({ kind: 'sheet', dogLine: who, text });
        return ai.ok ? normalizeSheetRead(ai.result, 'ai') : localReadSheet(text, 'local');
      }
    } catch {
      /* unreadable text file */
    }
  }

  return { medications: [], meals: [], found: false, source: 'local' };
}
