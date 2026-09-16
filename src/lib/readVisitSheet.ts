import * as FileSystem from 'expo-file-system/legacy';

import { SAMPLE_VISIT_SHEET } from '@/content/sampleVisitSheet';
import { localReadSheet, normalizeSheetRead, type SheetRead } from '@/engine/sheetMeds';

import type { Dog } from './database.types';
import { isImagePath } from './media';

function dogLine(dog: Dog | null) {
  if (!dog) return 'this dog';
  return [dog.name, dog.breed].filter(Boolean).join(', ');
}

/** Read a visit photo, a text file, or the built-in sample. Never invents a drug that is not on the page. */
export async function readVisitSheet(input: { uri?: string | null; path?: string; text?: string; dog: Dog | null; sample?: boolean }): Promise<SheetRead> {
  if (input.sample || input.text) {
    const text = input.text ?? SAMPLE_VISIT_SHEET;
    const local = localReadSheet(text, input.sample ? 'sample' : 'local');
    const ai = await readSheetText(text, input.dog);
    return ai.found ? ai : local;
  }

  const path = input.path ?? input.uri ?? '';
  if (input.uri && isImagePath(path)) {
    const ai = await readSheetImage(input.uri, input.dog);
    if (ai.found) return ai;
  }

  if (input.uri && !isImagePath(path)) {
    try {
      const text = await FileSystem.readAsStringAsync(input.uri);
      if (text && !text.includes('\u0000') && /medication|tablet|capsule|mg\b|give /i.test(text) && text.length < 40_000) {
        const local = localReadSheet(text, 'local');
        const ai = await readSheetText(text, input.dog);
        return ai.found ? ai : local;
      }
    } catch {
      // Binary PDF: photograph the page for a read.
    }
  }

  return { medications: [], meals: [], found: false, source: 'local' };
}

async function readSheetText(text: string, dog: Dog | null): Promise<SheetRead> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) return localReadSheet(text, 'local');
  return askModel(key, [{ type: 'text', text: `Discharge text:\n${text.slice(0, 8000)}\nDog: ${dogLine(dog)}.` }]);
}

async function readSheetImage(uri: string, dog: Dog | null): Promise<SheetRead> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) return { medications: [], meals: [], found: false, source: 'local' };
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return askModel(key, [
      { type: 'text', text: `Read this clinic discharge or vaccine card for ${dogLine(dog)}. Extract only medications and meal times that are written.` },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
    ]);
  } catch {
    return { medications: [], meals: [], found: false, source: 'local' };
  }
}

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

async function askModel(key: string, content: ContentPart[]): Promise<SheetRead> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Extract medications and feeding times from a veterinary discharge. You are not a veterinarian. Never invent a drug, dose, or time. If it is not written, omit it. JSON only: {"medications":[{"name","dose","times":["HH:MM"],"withFood":true,"days":7,"note":null}],"meals":[{"time":"HH:MM","label":"Breakfast"}]}',
          },
          { role: 'user', content },
        ],
      }),
    });
    if (!res.ok) return { medications: [], meals: [], found: false, source: 'ai' };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return { medications: [], meals: [], found: false, source: 'ai' };
    const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, '')) as Partial<SheetRead>;
    return normalizeSheetRead(parsed, 'ai');
  } catch {
    return { medications: [], meals: [], found: false, source: 'ai' };
  }
}
