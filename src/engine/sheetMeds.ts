import type { Reminder } from '@/lib/reminders';
import { prettyTime, ymd } from '@/lib/reminders';

export const MEDS_START = '--- Medications ---';
export const MEDS_END = '--- End medications ---';
export const SHOTS_START = '--- Shots ---';
export const SHOTS_END = '--- End shots ---';

export type SheetMed = {
  name: string;
  /** How much to give, e.g. 1 tablet or 2 ml. */
  quantity: string | null;
  /** Strength on the bottle, e.g. 75 mg. */
  dose: string | null;
  times: string[];
  withFood: boolean;
  /** Course length from the sheet, or a 7-day reminder window when a time exists. */
  days: number | null;
  note: string | null;
};

type RawMed = {
  name?: string | null;
  drug?: string | null;
  medication?: string | null;
  drugName?: string | null;
  quantity?: string | null;
  qty?: string | null;
  amount?: string | null;
  dose?: string | null;
  strength?: string | null;
  times?: string[];
  frequency?: string | null;
  withFood?: boolean;
  days?: number | string | null;
  duration?: number | string | null;
  note?: string | null;
};

export type SheetMeal = { time: string; label: string; days: number | null };

export type SheetFollowUp = {
  title: string;
  date: string;
  time: string;
  kind: 'vaccine' | 'vet';
  note: string | null;
};

type RawFollow = {
  title?: string | null;
  name?: string | null;
  date?: string | null;
  when?: string | null;
  time?: string | null;
  kind?: string | null;
  note?: string | null;
};

export type SheetClinic = {
  vetName: string | null;
  vetPhone: string | null;
  microchip: string | null;
};

export type SheetRead = {
  medications: SheetMed[];
  meals: SheetMeal[];
  followUps: SheetFollowUp[];
  clinic: SheetClinic;
  found: boolean;
  source: 'ai' | 'local';
};

export function emptyClinic(): SheetClinic {
  return { vetName: null, vetPhone: null, microchip: null };
}

export function clinicHasFacts(clinic?: SheetClinic | null) {
  return Boolean(clinic?.vetName || clinic?.vetPhone || clinic?.microchip);
}

const MAX_DAYS = 14;
const MAX_TIMES = 4;
/** When the sheet names a drug and a rhythm but no course length, keep a week of reminders. */
export const DEFAULT_COURSE_DAYS = 7;

export function normalizeSheetRead(raw: unknown, source: SheetRead['source']): SheetRead {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const medications = firstArray<RawMed>(o, ['medications', 'meds', 'prescriptions', 'drugs', 'rx', 'medication'])
    .map((m) => {
      const name = (m.name ?? m.drug ?? m.medication ?? m.drugName ?? '').trim();
      const quantity = clean(m.quantity ?? m.qty ?? m.amount);
      const dose = clean(m.dose ?? m.strength);
      const blob = [m.frequency, m.note, quantity, dose, name].filter(Boolean).join(' ');
      const fromClock = uniqueTimes(m.times);
      const times = fromClock.length ? fromClock : timesFromFrequency(blob).length ? timesFromFrequency(blob) : name ? ['08:00'] : [];
      const listedDays = daysFromUnknown(m.days) ?? daysFromUnknown(m.duration);
      return {
        name,
        quantity,
        dose,
        times,
        withFood: Boolean(m.withFood) || /with food|with meals?/i.test(blob),
        days: listedDays ?? (times.length ? DEFAULT_COURSE_DAYS : null),
        note: clean(m.note) ?? (listedDays ? null : times.length ? '7-day reminder window. Change if the course is longer.' : frequencyHint(blob)),
      };
    })
    .filter((m) => m.name.length > 2 && !NOT_A_DRUG.test(m.name));
  const meals = firstArray<SheetMeal>(o, ['meals', 'feeding', 'feeds'])
    .map((m) => ({ time: normalizeTime(m.time), label: (m.label ?? 'Meal').trim() || 'Meal', days: clampDays(m.days) }))
    .filter((m) => m.time);
  const followUps = firstArray<RawFollow>(o, ['followUps', 'follow_ups', 'followups', 'vaccines', 'shots'])
    .map((f) => {
      const title = (f.title ?? f.name ?? '').trim();
      const date = parseFollowUpDate(f.date ?? f.when) ?? parseFollowUpDate(asString(f.note));
      const kind: SheetFollowUp['kind'] = f.kind === 'vaccine' || isShotTitle(title) ? 'vaccine' : 'vet';
      return {
        title,
        date: date ?? '',
        time: normalizeTime(f.time ?? undefined) || '09:00',
        kind,
        note: clean(f.note),
      };
    })
    .filter((f) => f.title.length > 1 && f.date);
  const clinic = clinicFromRaw(o);
  return {
    medications,
    meals,
    followUps,
    clinic,
    found: medications.length > 0 || meals.length > 0 || followUps.length > 0 || clinicHasFacts(clinic),
    source,
  };
}

function firstArray<T>(o: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const v = o[key];
    if (Array.isArray(v)) return v as T[];
    if (v && typeof v === 'object') return [v as T];
  }
  return [];
}

function daysFromUnknown(v: unknown) {
  if (typeof v === 'number') return clampDays(v);
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/[^\d.-]/g, ''), 10);
    return Number.isFinite(n) ? clampDays(n) : null;
  }
  return null;
}

export function mergeSheetReads(reads: SheetRead[]): SheetRead {
  const medications: SheetMed[] = [];
  const meals: SheetMeal[] = [];
  const followUps: SheetFollowUp[] = [];
  const seen = new Set<string>();
  for (const read of reads) {
    for (const med of read.medications) {
      const key = med.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      medications.push(med);
    }
    meals.push(...read.meals);
    for (const follow of read.followUps ?? []) {
      const key = followKey(follow);
      if (seen.has(key)) continue;
      seen.add(key);
      followUps.push(follow);
    }
  }
  const clinic = emptyClinic();
  for (const read of reads) {
    if (!clinic.vetName && read.clinic?.vetName) clinic.vetName = read.clinic.vetName;
    if (!clinic.vetPhone && read.clinic?.vetPhone) clinic.vetPhone = read.clinic.vetPhone;
    if (!clinic.microchip && read.clinic?.microchip) clinic.microchip = read.clinic.microchip;
  }
  return {
    medications,
    meals,
    followUps,
    clinic,
    found: medications.length > 0 || meals.length > 0 || followUps.length > 0 || clinicHasFacts(clinic),
    source: reads.some((r) => r.source === 'ai') ? 'ai' : 'local',
  };
}

function clean(s: string | null | undefined) {
  const t = s?.trim();
  return t ? t : null;
}

function asString(v: unknown) {
  return typeof v === 'string' ? v : v == null ? null : String(v);
}

export function normalizePhone(raw: string | null | undefined) {
  const s = raw?.trim() ?? '';
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  return s.length >= 7 ? s : null;
}

function cleanChip(raw: string | null | undefined) {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.length === 10 || digits.length === 11) return null;
  return digits;
}

function cleanClinicName(raw: string | null | undefined) {
  const t = clean(raw);
  if (!t || t.length > 80) return null;
  if (/certificate|vaccination|license|county|state of|expires|microchip/i.test(t) && !/hospital|clinic|veterinary|animal/i.test(t)) return null;
  return t;
}

function clinicFromRaw(o: Record<string, unknown>): SheetClinic {
  const nested = o.clinic && typeof o.clinic === 'object' ? (o.clinic as Record<string, unknown>) : {};
  const vetName = cleanClinicName(
    asString(nested.vetName ?? nested.vet_name ?? nested.clinicName ?? nested.hospital ?? nested.clinic ?? o.vetName ?? o.vet_name ?? o.clinicName),
  );
  const vetPhone = normalizePhone(asString(nested.vetPhone ?? nested.vet_phone ?? nested.phone ?? nested.telephone ?? o.vetPhone ?? o.phone));
  const microchip = cleanChip(asString(nested.microchip ?? nested.chip ?? o.microchip));
  return { vetName, vetPhone, microchip };
}

/** Missing or non-positive days stay null. Do not default to a week. */
export function clampDays(n: number | undefined | null) {
  if (n == null || !Number.isFinite(n) || n < 1) return null;
  return Math.min(MAX_DAYS, Math.round(n));
}

function uniqueTimes(times: string[] | undefined) {
  const out: string[] = [];
  for (const t of times ?? []) {
    const n = normalizeTime(t);
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= MAX_TIMES) break;
  }
  return out;
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

const NOT_A_DRUG = /^(patient|discharge|feeding|notes?|give|do|take|recheck|return|call|monitor|watch|keep|apply|clean|continue|start|stop|then|with|food|water|daily|every|morning|evening|night|breakfast|dinner|lunch|dose|doses|tablet|tablets|capsule|capsules|mg|ml|the|and|for|not|per|once|twice|three|days?|weeks?)$/i;

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
    const strength = med[2]?.trim() || null;
    const hint = frequencyHint(line);
    const quantity = quantityFromLine(line);
    medications.push({
      name,
      quantity,
      dose: doseFromLine(line, strength),
      times: clocksOnLine(line).length ? clocksOnLine(line) : timesFromFrequency(`${line} ${hint ?? ''}`),
      withFood: /with food|with meals?|with breakfast|with dinner/i.test(line),
      days: daysFromLine(line),
      note: hint,
    });
  }
  const meals: SheetMeal[] = [];
  const breakfast = text.match(/breakfast[^\n]*?(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  const dinner = text.match(/dinner[^\n]*?(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  const breakfastTime = breakfast ? normalizeTime(breakfast[1]) : '';
  const dinnerTime = dinner ? normalizeTime(dinner[1]) : '';
  if (breakfastTime) meals.push({ time: breakfastTime, label: 'Breakfast', days: null });
  if (dinnerTime) meals.push({ time: dinnerTime, label: 'Dinner', days: null });
  return normalizeSheetRead({ medications, meals, followUps: shotsFromCertText(text), clinic: clinicFromText(text) }, source);
}

const MONTH: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function isShotTitle(title: string) {
  return /shot|rabies|dhpp|dhpp|bordetella|lepto|lyme|influenza|parvo|distemper|vaccine|vax|booster/i.test(title);
}

function followKey(follow: SheetFollowUp) {
  const title = follow.title.toLowerCase();
  if (follow.kind === 'vaccine' || isShotTitle(follow.title)) {
    if (/rabies/.test(title)) return 'follow:vax:rabies';
    if (/dhpp|distemper/.test(title)) return 'follow:vax:dhpp';
    if (/bordetella|kennel/.test(title)) return 'follow:vax:bordetella';
    return `follow:vax:${title}`;
  }
  return `follow:vet:${title}:${follow.date}`;
}

function parseDateToken(raw: string, now: Date): string | null {
  const s = raw.trim().replace(/[.,;]+$/g, '');
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : s;
  }
  const monthYearNum = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (monthYearNum) {
    const month = parseInt(monthYearNum[1], 10) - 1;
    if (month < 0 || month > 11) return null;
    return ymd(new Date(parseInt(monthYearNum[2], 10), month, 1));
  }
  const yearMonth = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (yearMonth) {
    const month = parseInt(yearMonth[2], 10) - 1;
    if (month < 0 || month > 11) return null;
    return ymd(new Date(parseInt(yearMonth[1], 10), month, 1));
  }
  const mdY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdY) {
    let y = parseInt(mdY[3], 10);
    if (y < 100) y += 2000;
    const d = new Date(y, parseInt(mdY[1], 10) - 1, parseInt(mdY[2], 10));
    return Number.isNaN(d.getTime()) ? null : ymd(d);
  }
  const inN = s.match(/in\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)/i);
  if (inN) {
    const n = parseInt(inN[1], 10);
    const d = new Date(now);
    const u = inN[2].toLowerCase();
    if (u.startsWith('day')) d.setDate(d.getDate() + n);
    else if (u.startsWith('week')) d.setDate(d.getDate() + n * 7);
    else if (u.startsWith('year')) d.setFullYear(d.getFullYear() + n);
    else d.setMonth(d.getMonth() + n);
    return ymd(d);
  }
  const named = s.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?$/i,
  );
  if (named) {
    const month = MONTH[named[1].toLowerCase()];
    if (month == null) return null;
    const day = parseInt(named[2], 10);
    let year = named[3] ? parseInt(named[3], 10) : now.getFullYear();
    const d = new Date(year, month, day);
    if (!named[3] && d.getTime() < now.getTime() - 86_400_000) d.setFullYear(year + 1);
    return Number.isNaN(d.getTime()) ? null : ymd(d);
  }
  const monthYear = s.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})$/i,
  );
  if (monthYear) {
    const month = MONTH[monthYear[1].toLowerCase()];
    if (month == null) return null;
    return ymd(new Date(parseInt(monthYear[2], 10), month, 1));
  }
  return null;
}

function firstLooseDate(blob: string, now: Date) {
  const iso = blob.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return parseDateToken(iso[1], now);
  const mdY = blob.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  if (mdY) return parseDateToken(mdY[1], now);
  const named = blob.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?\b/i,
  );
  if (named) return parseDateToken(named[0], now);
  const monthYear = blob.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\b/i,
  );
  if (monthYear) return parseDateToken(monthYear[0], now);
  const my = blob.match(/\b(\d{1,2}[/-]\d{4})\b/);
  if (my) return parseDateToken(my[1], now);
  return null;
}

export function parseFollowUpDate(raw: string | null | undefined, now = new Date()): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const expire = s.match(/(?:expir(?:es|ed|ation|y)|next due|due(?: date)?|valid(?: through| until)?)[:\s-]+([A-Za-z0-9,./\- ]{4,40})/i);
  if (expire) {
    const hit = parseDateToken(expire[1], now) ?? firstLooseDate(expire[1], now);
    if (hit) return hit;
  }
  return parseDateToken(s, now) ?? firstLooseDate(s, now);
}

function followUpsFromText(text: string): RawFollow[] {
  const out: RawFollow[] = [];
  for (const line of text.split(/\n+/)) {
    if (!/recheck|follow[- ]?up|return|due|vaccine|vax|shot|rabies|booster/i.test(line)) continue;
    const date = parseFollowUpDate(line);
    if (!date) continue;
    const titleMatch = line.match(/(rabies|dhpp|dhpp|bordetella|lepto|lyme|influenza|parvo|distemper|vaccine|booster|recheck|follow[- ]?up)/i);
    out.push({
      title: titleMatch?.[1] ? `${titleMatch[1]} visit` : 'Follow-up',
      date,
      kind: isShotTitle(line) ? 'vaccine' : 'vet',
    });
  }
  return out;
}

function firstDateIn(blob: string) {
  return parseFollowUpDate(blob);
}

function dateForShot(label: RegExp, text: string) {
  if (!label.test(text)) return null;
  const idx = text.search(label);
  const near = idx >= 0 ? firstDateIn(text.slice(Math.max(0, idx - 40), idx + 220)) : null;
  if (near) return near;
  if (/rabies/i.test(label.source)) return firstDateIn(text);
  return null;
}

/** Rabies cards print the shot name on one line and the expiration on another. */
function shotsFromCertText(text: string): RawFollow[] {
  const out = followUpsFromText(text);
  const add = (title: string, date: string | null) => {
    if (!date || out.some((f) => (f.title ?? '').toLowerCase().includes(title.toLowerCase()))) return;
    out.push({ title, date, kind: 'vaccine' });
  };
  add('Rabies', dateForShot(/rabies/i, text));
  add('DHPP', dateForShot(/dhpp|distemper/i, text));
  add('Bordetella', dateForShot(/bordetella|kennel cough/i, text));
  add('Lepto', dateForShot(/\blepto/i, text));
  add('Lyme', dateForShot(/\blyme\b/i, text));
  return out;
}

function clinicFromText(text: string): SheetClinic {
  const phoneMatch = text.match(/(?:phone|tel|telephone|office)[:\s]*([+()0-9.\-\s]{10,22})/i) ?? text.match(/(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/);
  const chipMatch = text.match(/microchip[:\s#]*([0-9 ]{9,20})/i);
  const hospital = text.match(/([A-Z][A-Za-z0-9'&. -]{2,50}(?:Animal Hospital|Veterinary(?: Hospital| Clinic)?|Animal Clinic|Pet Hospital))/i);
  const vetPerson = text.match(/(?:veterinarian|vaccinated by|signed by)[:\s]+(?:Dr\.?\s*)?([A-Z][A-Za-z.' -]{2,40})/i);
  return {
    vetName: cleanClinicName(hospital?.[1] ?? (vetPerson?.[1] ? `Dr. ${vetPerson[1]}` : null)),
    vetPhone: normalizePhone(phoneMatch?.[1] ?? phoneMatch?.[0]),
    microchip: cleanChip(chipMatch?.[1]),
  };
}

export function hasProfileOffer(read: SheetRead) {
  const shots = (read.followUps ?? []).some((f) => f.kind === 'vaccine' || isShotTitle(f.title));
  return shots || clinicHasFacts(read.clinic);
}

export function profileOfferMessage(dogName: string, read: SheetRead) {
  const clinic = read.clinic ?? emptyClinic();
  const bits: string[] = [];
  for (const f of read.followUps ?? []) {
    if (f.kind === 'vaccine' || isShotTitle(f.title)) bits.push(`${f.title} ${f.date}`);
  }
  if (clinic.vetName) bits.push(clinic.vetName);
  if (clinic.vetPhone) bits.push(clinic.vetPhone);
  if (clinic.microchip) bits.push(`microchip ${clinic.microchip}`);
  const listed = bits.join(', ');
  return listed
    ? `This visit has ${listed}. Add the shot dates and clinic details to ${dogName}'s profile? You can edit them first.`
    : `Add the shot dates and clinic details to ${dogName}'s profile? You can edit them first.`;
}

function clocksOnLine(line: string) {
  const out: string[] = [];
  const re = /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\b\d{1,2}:\d{2}\b)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    const n = normalizeTime(match[1]);
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= MAX_TIMES) break;
  }
  return out;
}

/** Clock times implied by a written frequency. Does not invent a frequency that is not on the sheet. */
export function timesFromFrequency(text: string): string[] {
  if (!text) return [];
  if (/every\s*6\s*h|q\s*6\s*h|four\s*times|qid\b|4x/i.test(text)) return ['08:00', '12:00', '16:00', '20:00'];
  if (/every\s*8\s*h|q\s*8\s*h|three\s*times|tid\b|3x/i.test(text)) return ['08:00', '14:00', '20:00'];
  if (/every\s*12\s*h|q\s*12\s*h|twice|bid\b|2x/i.test(text)) return ['08:00', '20:00'];
  if (/every\s*24\s*h|q\s*24\s*h|once\s*(daily|a day)|sid\b|eod\b|every other/i.test(text)) return ['08:00'];
  if (/with\s+(dinner|evening|supper)/i.test(text)) return ['18:00'];
  if (/with\s+(breakfast|morning|food)|daily|q24|prn|as needed/i.test(text)) return ['08:00'];
  return [];
}

function frequencyHint(line: string) {
  if (/every\s*12\s*hours|twice\s*(daily|a day)|2x/i.test(line)) return 'Twice daily.';
  if (/every\s*8\s*hours|three\s*times/i.test(line)) return 'Three times a day.';
  if (/every\s*24\s*hours|once\s*(daily|a day)|once daily/i.test(line)) return 'Once daily.';
  if (/\bdaily\b/i.test(line)) return 'Daily.';
  return null;
}

function quantityFromLine(line: string) {
  const amount = '((?:\\d+\\s*/\\s*\\d+)|\\d+(?:\\.\\d+)?|[½¼¾])';
  const tabs = line.match(new RegExp(`${amount}\\s*(tablet|capsule|ml|cc|drop)s?\\b`, 'i'));
  if (!tabs) return null;
  const n = tabs[1].replace(/\s+/g, '');
  const unit = tabs[2].toLowerCase();
  const plural = n === '1' || n === '½' || n === '1/2' ? unit : unit.endsWith('s') ? unit : `${unit}s`;
  return `${n} ${plural}`;
}

/** Prefer "1/2 tablet" over tablet strength alone when both are on the line. */
function doseFromLine(line: string, strength: string | null) {
  return strength;
}

function daysFromLine(line: string) {
  const m = line.match(/for\s+(\d+)\s+days/i) || line.match(/(\d+)\s*-?\s*days?\s+course/i);
  return m ? clampDays(parseInt(m[1], 10)) : null;
}

/** Rebuild a sheet read from the medications block already saved on the dog. */
export function sheetReadFromNotes(notes: string | null): SheetRead {
  if (!notes?.includes(MEDS_START)) return { medications: [], meals: [], followUps: [], clinic: emptyClinic(), found: false, source: 'local' };
  const chunk = notes.split(MEDS_START)[1]?.split(MEDS_END)[0] ?? '';
  const medications = chunk
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(' · ').map((s) => s.trim());
      const head = parts[0] ?? '';
      const blob = parts.slice(1).join(' · ');
      const times = uniqueTimes(blob.match(/\b\d{1,2}:\d{2}\b/g) ?? undefined);
      const daysMatch = blob.match(/(\d+)\s+days?/i);
      const dose = head.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu)\b)/i)?.[1] ?? null;
      const name = head.replace(/\s+\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu)\b.*$/i, '').trim() || head;
      return {
        name,
        dose,
        quantity: null,
        times,
        frequency: null,
        withFood: /with food/i.test(blob),
        days: daysMatch ? parseInt(daysMatch[1], 10) : DEFAULT_COURSE_DAYS,
        note: 'from profile',
      };
    });
  return normalizeSheetRead({ medications }, 'local');
}

export function sheetShotsFromNotes(notes: string | null): SheetRead {
  if (!notes?.includes(SHOTS_START)) return { medications: [], meals: [], followUps: [], clinic: emptyClinic(), found: false, source: 'local' };
  const chunk = notes.split(SHOTS_START)[1]?.split(SHOTS_END)[0] ?? '';
  const followUps = chunk
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean)
    .map((line) => {
      const [title, when] = line.split(' · ').map((s) => s.trim());
      return { title: title || 'Shot', date: when || '', kind: 'vaccine' as const };
    });
  return normalizeSheetRead({ followUps }, 'local');
}

export function writeShotsBlock(notes: string | null, shots: { title: string; date: string }[]) {
  const stripped = (notes ?? '').replace(new RegExp(`${escapeReg(SHOTS_START)}[\\s\\S]*?${escapeReg(SHOTS_END)}\\s*`, 'g'), '').trim();
  const listed = shots.filter((s) => s.title.trim() && s.date.trim());
  if (!listed.length) return stripped || null;
  const block = [SHOTS_START, ...listed.map((s) => `- ${s.title.trim()} · ${s.date.trim()}`), SHOTS_END].join('\n');
  return [stripped, block].filter(Boolean).join('\n\n');
}

export function writeMedsBlock(notes: string | null, meds: SheetMed[]) {
  const stripped = (notes ?? '').replace(new RegExp(`${escapeReg(MEDS_START)}[\\s\\S]*?${escapeReg(MEDS_END)}\\s*`, 'g'), '').trim();
  if (!meds.length) return stripped || null;
  const block = [
    MEDS_START,
    ...meds.map((m) => {
      const when = m.times.length ? m.times.join(', ') : 'times not listed';
      const course = m.days ? ` · ${m.days} days` : '';
      const food = m.withFood ? ' with food' : '';
      return `- ${m.name}${m.quantity ? ` ${m.quantity}` : ''}${m.dose ? ` ${m.dose}` : ''} · ${when}${course}${food}`;
    }),
    MEDS_END,
  ].join('\n');
  return [stripped, block].filter(Boolean).join('\n\n');
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function medGiveLine(med: SheetMed) {
  const qty = med.quantity && med.quantity !== med.dose ? med.quantity : null;
  const dose = med.dose && med.dose !== med.quantity ? med.dose : null;
  return [qty, dose].filter(Boolean).join(' · ') || null;
}

export function medWhenLine(med: SheetMed) {
  return med.times.length ? med.times.map((t) => prettyTime(t)).join(' and ') : null;
}

export function medCalendarTitle(med: SheetMed) {
  const give = medGiveLine(med);
  const food = med.withFood ? ' with food' : '';
  return [med.name, give].filter(Boolean).join(' · ') + food;
}

function courseDays(med: SheetMed) {
  return med.days ?? (med.times.length ? DEFAULT_COURSE_DAYS : null);
}

/** A named drug on the sheet is enough to remind. Morning is the stand-in until a clock is written. */
export function prepareSheetMed(med: SheetMed): SheetMed {
  const times = med.times.length ? med.times : ['08:00'];
  return {
    ...med,
    times,
    days: med.days ?? DEFAULT_COURSE_DAYS,
    note: med.note ?? (med.times.length ? null : 'No clock on the sheet. Morning reminder until you change it.'),
  };
}

function canScheduleMed(med: SheetMed) {
  const ready = prepareSheetMed(med);
  return ready.times.length > 0 && courseDays(ready) != null;
}

function canScheduleMeal(meal: SheetMeal) {
  return Boolean(meal.time) && meal.days != null && meal.days > 0;
}

export function remindersFromSheet(dogId: string, read: SheetRead): Omit<Reminder, 'id'>[] {
  const start = new Date();
  const follows: Omit<Reminder, 'id'>[] = [];
  for (const follow of read.followUps ?? []) {
    if (!follow.title.trim() || !follow.date) continue;
    follows.push({
      dogId,
      kind: follow.kind === 'vaccine' || isShotTitle(follow.title) ? 'vaccine' : 'vet',
      title: follow.title,
      time: follow.time || '09:00',
      date: follow.date,
      notes: `sheet:${follow.note ?? 'from visit'}`,
    });
  }

  const doses: Omit<Reminder, 'id'>[] = [];
  for (const med of read.medications) {
    const ready = prepareSheetMed(med);
    const days = courseDays(ready);
    if (!canScheduleMed(ready) || days == null) continue;
    for (let d = 0; d < days; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const date = ymd(day);
      for (const time of ready.times) {
        doses.push({
          dogId,
          kind: 'medication',
          title: medCalendarTitle(ready),
          time,
          date,
          notes: `sheet:${ready.note ?? 'from visit'}`,
        });
      }
    }
  }

  const meals: Omit<Reminder, 'id'>[] = [];
  for (const meal of read.meals) {
    if (!canScheduleMeal(meal) || meal.days == null) continue;
    for (let d = 0; d < meal.days; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      meals.push({
        dogId,
        kind: 'meal',
        title: meal.label,
        time: meal.time,
        date: ymd(day),
        notes: 'sheet:feeding from visit',
      });
    }
  }

  return [...follows, ...doses, ...meals].slice(0, 240);
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
  if (!read.found) return 'No medications, shots, clinic details, or meal times were on that sheet.';
  const plan = read.medications
    .map(prepareSheetMed)
    .filter(canScheduleMed)
    .map((m) => {
      const days = courseDays(m);
      const clocks = m.times.map((t) => prettyTime(t)).join(' and ');
      return `${medCalendarTitle(m)} at ${clocks} for ${days} day${days === 1 ? '' : 's'}`;
    });
  const meals = read.meals.map((m) => `${m.label} ${m.time}`).join(', ');
  const shots = (read.followUps ?? []).map((f) => `${f.title} on ${f.date}`).join(', ');
  const clinic = [read.clinic?.vetName, read.clinic?.vetPhone, read.clinic?.microchip ? `microchip ${read.clinic.microchip}` : null]
    .filter(Boolean)
    .join(', ');
  const listedOnly = read.medications.filter((m) => !canScheduleMed(m)).map((m) => m.name);
  const scheduled = plan.length > 0 || (read.followUps ?? []).length > 0;
  return [
    plan.length ? `On the calendar: ${plan.join('. ')}.` : '',
    shots && `Shots: ${shots}.`,
    clinic && `Clinic: ${clinic}.`,
    meals && `Meals: ${meals}.`,
    !scheduled && read.medications.length ? 'No reminders yet. Add a time and how many days first.' : '',
    listedOnly.length ? `Still need a time or course length: ${listedOnly.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
