import * as FileSystem from 'expo-file-system/legacy';

import { scrapePdfText } from '@/engine/pdfText';
import { localReadSheet, mergeSheetReads, normalizeSheetRead, type SheetRead } from '@/engine/sheetMeds';

import { callAi, photoToBase64, type AiReason } from './ai';
import type { Dog } from './database.types';
import { extOf, isImagePath } from './media';

function dogLine(dog: Dog | null) {
  if (!dog) return 'this dog';
  return [dog.name, dog.breed].filter(Boolean).join(', ');
}

type ModelSheet = Record<string, unknown>;

function emptySheet(reason?: AiReason): VisitSheetResult {
  return { medications: [], meals: [], followUps: [], found: false, source: 'local', reason };
}

export type VisitSheetResult = SheetRead & { reason?: AiReason };

const TEXT_EXT = /^(txt|md|csv)$/i;
const PDF_EXT = /^pdf$/i;
const MAX_FILE_CHARS = 40_000;

export function mimeFromPath(path: string, fallback?: string) {
  const ext = extOf(path);
  if (PDF_EXT.test(ext)) return 'application/pdf';
  if (TEXT_EXT.test(ext)) return ext === 'md' ? 'text/markdown' : ext === 'csv' ? 'text/csv' : 'text/plain';
  if (isImagePath(path) || /^(heif|tif|tiff|bmp)$/i.test(ext)) {
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'heic' || ext === 'heif') return 'image/heic';
    return 'image/jpeg';
  }
  return fallback ?? 'application/octet-stream';
}

function looksPdf(path: string, mime?: string) {
  return PDF_EXT.test(extOf(path)) || mime === 'application/pdf';
}

function looksText(path: string, mime?: string) {
  return TEXT_EXT.test(extOf(path)) || mime === 'text/plain' || mime === 'text/markdown' || mime === 'text/csv';
}

function looksImage(path: string, mime?: string) {
  return isImagePath(path) || Boolean(mime?.startsWith('image/')) || /^(heif|tif|tiff|bmp)$/i.test(extOf(path));
}

async function readLocalText(uri: string) {
  const text = await FileSystem.readAsStringAsync(uri);
  if (!text || text.includes('\u0000') || text.length >= MAX_FILE_CHARS) return null;
  return text;
}

async function readFileBase64(uri: string) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function preferRead(current: VisitSheetResult, next: VisitSheetResult): VisitSheetResult {
  if (next.medications.length > current.medications.length) return next;
  if (next.found && !current.found) return next;
  if (!current.reason && next.reason) return { ...current, reason: next.reason };
  return current;
}

/**
 * Read a visit photo, PDF, or text file for medications, follow-ups, and meal times.
 * The model runs on the server. Plain text still gets the local parser
 * when the model is unavailable. Existing uploads can be re-read from a cached file URI.
 */
export async function readVisitSheet(input: {
  uri?: string | null;
  path?: string;
  text?: string;
  mime?: string;
  dog: Dog | null;
}): Promise<VisitSheetResult> {
  const who = dogLine(input.dog);
  const path = input.path ?? input.uri ?? '';
  const mime = input.mime ?? mimeFromPath(path);

  if (input.text) {
    const ai = await callAi<ModelSheet>({ kind: 'sheet', dogLine: who, text: input.text });
    if (ai.ok) return normalizeSheetRead(ai.result, 'ai');
    const local = localReadSheet(input.text, 'local');
    return { ...local, reason: local.found ? undefined : ai.reason };
  }

  const uri = input.uri;
  if (!uri) return emptySheet('model_error');

  const imageLike = looksImage(path, mime) || looksImage(uri, mime);
  const pdfLike = looksPdf(path, mime) || looksPdf(uri, mime);
  const textLike = looksText(path, mime) || looksText(uri, mime);

  let best = emptySheet();
  if (imageLike || (!pdfLike && !textLike)) {
    best = preferRead(best, await readAsImage(uri, who));
    if (best.medications.length) return best;
  }
  if (pdfLike || (!imageLike && !textLike)) {
    best = preferRead(best, await readAsPdf(uri, path, who));
    if (best.medications.length) return best;
  }
  if (textLike) {
    best = preferRead(best, await readAsText(uri, who));
  }
  return best;
}

export async function readVisitSheets(
  files: { uri?: string | null; path?: string; mime?: string }[],
  dog: Dog | null,
): Promise<VisitSheetResult> {
  const reads: VisitSheetResult[] = [];
  let reason: AiReason | undefined;
  for (const file of files) {
    const read = await readVisitSheet({ ...file, dog });
    reads.push(read);
    if (!read.found && read.reason) reason = read.reason;
  }
  const merged = mergeSheetReads(reads);
  return { ...merged, reason: merged.found ? undefined : reason };
}

async function readAsImage(uri: string, who: string): Promise<VisitSheetResult> {
  try {
    const imageBase64 = await photoToBase64(uri);
    const ai = await callAi<ModelSheet>({ kind: 'sheet', dogLine: who, imageBase64 });
    if (ai.ok) return normalizeSheetRead(ai.result, 'ai');
    return emptySheet(ai.reason);
  } catch {
    return emptySheet('model_error');
  }
}

async function readAsPdf(uri: string, path: string, who: string): Promise<VisitSheetResult> {
  try {
    const fileBase64 = await readFileBase64(uri);
    if (!fileBase64) return emptySheet('model_error');
    const scraped = scrapePdfText(fileBase64);
    const ai = await callAi<ModelSheet>({
      kind: 'sheet',
      dogLine: who,
      text: scraped || undefined,
      fileBase64,
      fileMime: 'application/pdf',
      fileName: extOf(path) ? path.split('/').pop() : 'visit.pdf',
    });
    if (ai.ok) return normalizeSheetRead(ai.result, 'ai');
    if (scraped) {
      const local = localReadSheet(scraped, 'local');
      return { ...local, reason: local.found ? undefined : ai.reason };
    }
    return emptySheet(ai.reason);
  } catch {
    return emptySheet('model_error');
  }
}

async function readAsText(uri: string, who: string): Promise<VisitSheetResult> {
  try {
    const text = await readLocalText(uri);
    if (!text) return emptySheet('model_error');
    const ai = await callAi<ModelSheet>({ kind: 'sheet', dogLine: who, text });
    if (ai.ok) return normalizeSheetRead(ai.result, 'ai');
    const local = localReadSheet(text, 'local');
    return { ...local, reason: local.found ? undefined : ai.reason };
  } catch {
    return emptySheet('model_error');
  }
}

export function sheetReadFailNote(reason?: AiReason) {
  switch (reason) {
    case 'premium_required':
      return 'The visit is saved. Reload the app and tap Read if the reader did not run.';
    case 'not_configured':
      return 'The reader is not configured on the server yet.';
    case 'offline':
      return 'Need a connection to read the sheet.';
    case 'image_too_large':
      return 'That file is too large to read. Photograph the medications list.';
    case 'model_error':
      return 'Could not read that page. Medications already on the profile still go on the calendar.';
    default:
      return 'Saved. No medications, follow-ups, or meal times were on that page. Photograph the meds list or the vaccine dates.';
  }
}
