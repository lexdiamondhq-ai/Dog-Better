import { isShotTitle, sheetShotsFromNotes } from '@/engine/sheetMeds';
import { prettyDate } from '@/lib/reminders';

export type ShotTone = 'good' | 'warn' | 'bad' | 'neutral';

export type ShotStatus = {
  key: string;
  title: string;
  date: string | null;
  tone: ShotTone;
  line: string;
};

const CORE: { key: string; title: string; match: RegExp }[] = [
  { key: 'rabies', title: 'Rabies', match: /rabies/i },
  { key: 'dhpp', title: 'DHPP', match: /dhpp|distemper/i },
  { key: 'bordetella', title: 'Bordetella', match: /bordetella|kennel/i },
];

function daysUntil(date: string, today: string) {
  const a = new Date(`${date}T12:00:00`).getTime();
  const b = new Date(`${today}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}

function statusOf(date: string | null, today: string): { tone: ShotTone; line: string } {
  if (!date) return { tone: 'neutral', line: 'Not on a visit sheet yet' };
  const n = daysUntil(date, today);
  const when = prettyDate(date, today);
  if (n == null) return { tone: 'neutral', line: when };
  if (n < 0) return { tone: 'bad', line: `Overdue · was ${when}` };
  if (n === 0) return { tone: 'warn', line: 'Due today' };
  if (n <= 30) return { tone: 'warn', line: `Due ${when}` };
  return { tone: 'good', line: `Current through ${when}` };
}

/**
 * Rabies, DHPP, and Bordetella always sit in the record, filled from the care-sheet
 * shots block and any extra vaccine dates a visit read left behind.
 */
export function buildShotRecord(
  notes: string | null,
  today: string,
  extras: { title: string; date: string }[] = [],
): ShotStatus[] {
  const fromNotes = sheetShotsFromNotes(notes).followUps.filter((f) => f.date);
  const pool = [...fromNotes, ...extras.filter((e) => e.title.trim() && e.date)];
  const used = new Set<number>();

  const core = CORE.map((c) => {
    const i = pool.findIndex((p, idx) => !used.has(idx) && c.match.test(p.title));
    if (i >= 0) used.add(i);
    const date = i >= 0 ? pool[i]?.date || null : null;
    return { key: c.key, title: c.title, date, ...statusOf(date, today) };
  });

  const more: ShotStatus[] = [];
  pool.forEach((p, i) => {
    if (used.has(i) || !isShotTitle(p.title) || CORE.some((c) => c.match.test(p.title))) return;
    if (more.some((m) => m.title.toLowerCase() === p.title.toLowerCase())) return;
    used.add(i);
    more.push({ key: `extra:${p.title}:${p.date}`, title: p.title, date: p.date || null, ...statusOf(p.date || null, today) });
  });

  return [...core, ...more];
}

/** Core three plus extra vaccines a visit read already wrote into notes. */
export function shotsToWrite(
  values: { rabies: string; dhpp: string; bordetella: string },
  notes: string | null,
) {
  const extras = sheetShotsFromNotes(notes).followUps.filter((s) => !CORE.some((c) => c.match.test(s.title)));
  return persistableShots([
    { title: 'Rabies', date: values.rabies, kind: 'vaccine' },
    { title: 'DHPP', date: values.dhpp, kind: 'vaccine' },
    { title: 'Bordetella', date: values.bordetella, kind: 'vaccine' },
    ...extras,
  ]);
}

/** First date wins per shot name. Drops recheck visits that are not vaccines. */
export function persistableShots(followUps: { title: string; date: string; kind?: string }[]) {
  const out: { title: string; date: string }[] = [];
  const seen = new Set<string>();
  for (const f of followUps) {
    if (!f.date.trim() || !(f.kind === 'vaccine' || isShotTitle(f.title))) continue;
    const core = CORE.find((c) => c.match.test(f.title));
    const key = core?.key ?? f.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: core?.title ?? f.title.trim(), date: f.date.trim() });
  }
  return out;
}

export function shotRecordHeadline(rows: ShotStatus[]) {
  const overdue = rows.filter((r) => r.tone === 'bad').length;
  const soon = rows.filter((r) => r.tone === 'warn').length;
  const missing = rows.filter((r) => r.tone === 'neutral').length;
  const known = rows.length - missing;
  if (overdue) return `${overdue} overdue`;
  if (soon) return `${soon} due soon`;
  if (!known) return 'No shots on file';
  if (missing) return `${known} on file`;
  return 'Shots current';
}
