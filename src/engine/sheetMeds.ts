import type { Reminder } from '@/lib/reminders';
import { ymd } from '@/lib/reminders';

export const MEDS_START = '--- Medications ---';
export const MEDS_END = '--- End medications ---';

export type SheetMed = {
  name: string;
  dose: string | null;
  times: string[];
  withFood: boolean;
  days: number;
  note: string | null;
};

export type SheetMeal = { time: string; label: string };

export type SheetRead = {
  medications: SheetMed[];
  meals: SheetMeal[];
  found: boolean;
  source: 'ai' | 'local';
};

const MAX_DAYS = 14;
const MAX_TIMES = 4;

export function normalizeSheetRead(raw: Partial<SheetRead> | null, source: SheetRead['source']): SheetRead {
  const medications = (raw?.medications ?? [])
    .map((m) => ({
      name: (m.name ?? '').trim(),
      dose: m.dose?.trim() || null,
      times: uniqueTimes(m.times),
      withFood: Boolean(m.withFood),
      days: clampDays(m.days),
      note: m.note?.trim() || null,
    }))
    .filter((m) => m.name.length > 1);
  const meals = (raw?.meals ?? [])
    .map((m) => ({ time: normalizeTime(m.time), label: (m.label ?? 'Meal').trim() }))
    .filter((m) => m.time);
  return { medications, meals, found: medications.length > 0 || meals.length > 0, source };
}

function clampDays(n: number | undefined) {
  if (!n || n < 1) return 7;
  return Math.min(MAX_DAYS, Math.round(n));
}

function uniqueTimes(times: string[] | undefined) {
  const out: string[] = [];
  for (const t of times ?? []) {
    const n = normalizeTime(t);
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= MAX_TIMES) break;
  }
  return out.length ? out : ['08:00'];
}

export function normalizeTime(raw: string | undefined) {
  if (!raw) return '';
  const ampm = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const min = ampm[2] ?? '00';
    const pm = ampm[3].toLowerCase().startsWith('p');
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  const hm = raw.match(/(\d{1,2}):(\d{2})/);
  if (!hm) return '';
  const h = Math.min(23, parseInt(hm[1], 10));
  return `${String(h).padStart(2, '0')}:${hm[2]}`;
}

const NOT_A_DRUG = /^(patient|discharge|feeding|notes?|give|do|take|recheck|return|call|monitor|watch|keep|apply|clean|continue|start|stop|then|with|food|water|daily|every|morning|evening|night|breakfast|dinner|lunch|dose|doses|tablet|tablets|capsule|capsules|mg|ml|the|and|for|per|once|twice|three|days?|weeks?)$/i;

/**
 * Pull doses from plain clinic text when the model is unavailable. Deliberately conservative: a
 * line must carry a dose unit or an explicit dosing verb, and the candidate name must not be a
 * common instruction word. Missing a med is recoverable; inventing one is not.
 */
export function localReadSheet(text: string, source: SheetRead['source'] = 'local'): SheetRead {
  const medications: SheetMed[] = [];
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const med = line.match(/(?:^\s*\d+[.)]\s*)?([A-Za-z][A-Za-z0-9/-]{3,})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu)\b)/i);
    if (!med) continue;
    if (!/tablet|capsule|give|by mouth|orally|every|daily|twice|once|dose/i.test(line)) continue;
    const name = med[1];
    if (NOT_A_DRUG.test(name)) continue;
    medications.push({
      name,
      dose: med[2]?.trim() || null,
      times: timesFromLine(line),
      withFood: /with food|with meals?|with breakfast|with dinner/i.test(line),
      days: daysFromLine(line),
      note: null,
    });
  }
  const meals: SheetMeal[] = [];
  const breakfast = text.match(/breakfast[^\n]*?(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  const dinner = text.match(/dinner[^\n]*?(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  if (breakfast) meals.push({ time: normalizeTime(breakfast[1]) || '08:00', label: 'Breakfast' });
  if (dinner) meals.push({ time: normalizeTime(dinner[1]) || '18:00', label: 'Dinner' });
  return normalizeSheetRead({ medications, meals }, source);
}

function timesFromLine(line: string) {
  if (/every\s*12\s*hours|twice\s*(daily|a day)|2x/i.test(line)) return ['08:00', '20:00'];
  if (/every\s*8\s*hours|three\s*times/i.test(line)) return ['08:00', '14:00', '20:00'];
  if (/every\s*24\s*hours|once\s*(daily|a day)|daily/i.test(line)) return ['08:00'];
  return ['08:00', '20:00'];
}

function daysFromLine(line: string) {
  const m = line.match(/for\s+(\d+)\s+days/i);
  return m ? clampDays(parseInt(m[1], 10)) : 7;
}

export function writeMedsBlock(notes: string | null, meds: SheetMed[]) {
  const stripped = (notes ?? '').replace(new RegExp(`${escapeReg(MEDS_START)}[\\s\\S]*?${escapeReg(MEDS_END)}\\s*`, 'g'), '').trim();
  if (!meds.length) return stripped || null;
  const block = [
    MEDS_START,
    ...meds.map((m) => {
      const when = m.times.join(', ');
      const food = m.withFood ? ' with food' : '';
      return `- ${m.name}${m.dose ? ` ${m.dose}` : ''} · ${when}${food}`;
    }),
    MEDS_END,
  ].join('\n');
  return [stripped, block].filter(Boolean).join('\n\n');
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function remindersFromSheet(dogId: string, read: SheetRead): Omit<Reminder, 'id'>[] {
  const start = new Date();
  const out: Omit<Reminder, 'id'>[] = [];
  for (const med of read.medications) {
    for (let d = 0; d < med.days; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const date = ymd(day);
      for (const time of med.times) {
        const food = med.withFood ? ' with food' : '';
        out.push({
          dogId,
          kind: 'medication',
          title: `${med.name}${med.dose ? ` ${med.dose}` : ''}${food}`,
          time,
          date,
          notes: `sheet:${med.note ?? 'from visit'}`,
        });
      }
    }
  }
  for (const meal of read.meals) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      out.push({
        dogId,
        kind: 'meal',
        title: meal.label,
        time: meal.time,
        date: ymd(day),
        notes: 'sheet:feeding from visit',
      });
    }
  }
  return out.slice(0, 80);
}

export function medsLineFromNotes(notes: string | null) {
  if (!notes?.includes(MEDS_START)) return null;
  const chunk = notes.split(MEDS_START)[1]?.split(MEDS_END)[0]?.trim();
  if (!chunk) return null;
  return chunk
    .split('\n')
    .map((l) => l.replace(/^- /, '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function sheetReadSummary(read: SheetRead) {
  if (!read.found) return 'No medications or meal times were on that sheet.';
  const meds = read.medications.map((m) => m.name).join(', ');
  const meals = read.meals.map((m) => `${m.label} ${m.time}`).join(', ');
  return [meds && `Meds on the profile: ${meds}.`, meals && `Meal reminders: ${meals}.`, 'Calendar has the doses.'].filter(Boolean).join(' ');
}
