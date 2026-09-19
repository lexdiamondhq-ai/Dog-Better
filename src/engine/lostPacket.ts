import type { Dog, Walk } from '@/lib/database.types';
import type { Reminder } from '@/lib/reminders';
import { prettyTime } from '@/lib/reminders';
import { formatWeight } from '@/lib/units';
import type { WeightUnit } from '@/lib/preferences';
import { medsLineFromNotes } from '@/engine/sheetMeds';

export type LostHere = { latitude: number; longitude: number } | null;

export function buildLostPacket(input: {
  dog: Dog;
  ownerEmail?: string | null;
  weightUnit: WeightUnit;
  openMeds: Reminder[];
  lastWalk?: Walk | null;
  here?: LostHere;
}) {
  const { dog, ownerEmail, weightUnit, openMeds, lastWalk, here } = input;
  const meds =
    openMeds.length > 0
      ? openMeds
          .slice(0, 6)
          .map((r) => `- ${r.title} at ${prettyTime(r.time)} on ${r.date}`)
          .join('\n')
      : medsLineFromNotes(dog.notes) ?? '- None on file';
  const last = lastWalk
    ? `Last walk: ${new Date(lastWalk.started_at).toLocaleString()}${lastWalk.notes ? ` near ${lastWalk.notes}` : ''}`
    : 'Last walk: not logged';
  const pin = here ? `Last known: ${here.latitude.toFixed(5)}, ${here.longitude.toFixed(5)}` : null;

  return [
    `LOST DOG - ${dog.name.toUpperCase()}`,
    [dog.breed, dog.sex, dog.coat, formatWeight(dog.weight_kg, weightUnit)].filter(Boolean).join(' · '),
    dog.microchip ? `Microchip: ${dog.microchip}` : 'Microchip: not on file',
    '',
    'IF YOU FIND THEM',
    'Do not chase. Offer water. Call the number below. They may be on medication.',
    '',
    'MEDICATIONS DUE',
    meds,
    '',
    'CONTACTS',
    ownerEmail ? `Owner: ${ownerEmail}` : null,
    dog.vet_name ? `Vet: ${dog.vet_name}${dog.vet_phone ? ` ${dog.vet_phone}` : ''}` : null,
    '',
    last,
    pin,
    '',
    'Made with Dog Better',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function lostPosterHtml(dogName: string, body: string, photoUrl?: string | null) {
  const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const photo = photoUrl
    ? `<img src="${photoUrl}" alt="${dogName}" style="width:100%;max-height:22rem;object-fit:cover;border-radius:12px;margin:0 0 1.25rem" />`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lost ${dogName}</title>
<style>body{font:16px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;max-width:40rem;margin:1.5rem auto;padding:0 1rem;color:#1E120C;background:#F6EEE2}h1{font-size:1.8rem;margin:0 0 .5rem}pre{white-space:pre-wrap;font:15px/1.45 ui-monospace,Menlo,monospace}</style>
</head><body><h1>Lost: ${dogName}</h1>${photo}<pre>${escaped}</pre></body></html>`;
}
