import type { Dog, FoodScan, HealthLog, WeightEntry } from '@/lib/database.types';
import { dailyCalories } from '@/engine/foodSafety';
import { medsLineFromNotes } from '@/engine/sheetMeds';
import { humanize } from '@/lib/activity';
import type { WeightUnit } from '@/lib/preferences';
import { formatWeight, fromKg } from '@/lib/units';

/**
 * The plain-text handoff sheet: everything a sitter, walker, or family member needs on one screen.
 * Generated from the profile so it is never out of date. Phase 4 replaces this with role-based links.
 */
export function buildHandoffSheet(dog: Dog, ownerEmail?: string | null, weightUnit: WeightUnit = 'lb') {
  const kcal = dog.weight_kg ? dailyCalories(Number(dog.weight_kg)) : null;
  const lines = [
    `${dog.name.toUpperCase()} - CARE SHEET`,
    [dog.breed, dog.sex, formatWeight(dog.weight_kg, weightUnit)].filter(Boolean).join(' - '),
    '',
    'FEEDING',
    kcal ? `About ${kcal} kcal a day, split into two meals. Treats stay under ${Math.round(kcal * 0.1)} kcal total.` : 'Two meals a day. Ask the owner for amounts.',
    '',
    'DO NOT GIVE',
    dog.allergies?.length ? dog.allergies.map((a) => `- ${a}`).join('\n') : '- Nothing logged. Still: no grapes, onions, xylitol, chocolate, cooked bones.',
    '',
    'MEDICATIONS',
    medsLineFromNotes(dog.notes) ?? '- None pulled from a visit yet. Ask the owner.',
    '',
    'GOOD TO KNOW',
    dog.notes ?? '- Ask the owner for routines and quirks.',
    '',
    'EMERGENCY',
    dog.vet_name ? `Vet: ${dog.vet_name}${dog.vet_phone ? ` - ${dog.vet_phone}` : ''}` : 'Vet: ask the owner',
    'Visit records live on the profile. Upload them from the care sheet.',
    dog.microchip ? `Microchip: ${dog.microchip}` : null,
    ownerEmail ? `Owner: ${ownerEmail}` : null,
    '',
    'Vet now if: trouble breathing, collapse, seizure, swollen tight belly, pale gums, straining to pee, or anything toxic eaten.',
    '',
    'Made with Dog Better',
  ];
  return lines.filter((l) => l !== null).join('\n');
}

/** Memory for the exam room. Facts only. Not a diagnosis. */
export function buildClinicPack(input: {
  dog: Dog;
  ownerEmail?: string | null;
  weightUnit: WeightUnit;
  weights: WeightEntry[];
  health: HealthLog[];
  scans: FoodScan[];
}) {
  const { dog, ownerEmail, weightUnit, weights, health, scans } = input;
  const unit = weightUnit;
  const trend =
    weights.length >= 2
      ? weights
          .slice()
          .reverse()
          .map((w) => `${new Date(w.recorded_at).toLocaleDateString()} ${fromKg(Number(w.weight_kg), unit).toFixed(1)} ${unit}`)
          .join('\n')
      : weights[0]
        ? `${formatWeight(weights[0].weight_kg, unit)} on ${new Date(weights[0].recorded_at).toLocaleDateString()}`
        : 'No weights logged.';

  const symptoms = health.length
    ? health
        .slice(0, 12)
        .map((h) => {
          const when = new Date(h.created_at).toLocaleString();
          const lamp = { green: 'home watch', amber: 'vet within 24h', red: 'urgent' }[h.triage] ?? h.triage;
          return `${when}  ${h.symptoms.map(humanize).join(', ')}  (${lamp})`;
        })
        .join('\n')
    : 'No symptom logs.';

  const treats = scans.length
    ? scans
        .slice(0, 8)
        .map((s) => `${new Date(s.created_at).toLocaleDateString()}  ${s.product_name ?? 'item'}  ${s.verdict}`)
        .join('\n')
    : 'No treat checks.';

  return [
    `${dog.name.toUpperCase()} - CLINIC PACK`,
    'A record of what the owner logged. This is not a diagnosis.',
    `Printed ${new Date().toLocaleString()}`,
    '',
    'IDENTITY',
    [dog.breed, dog.sex, dog.birthdate ? `born ${dog.birthdate}` : null, formatWeight(dog.weight_kg, unit)].filter(Boolean).join(' · ') || 'Profile incomplete',
    dog.microchip ? `Microchip: ${dog.microchip}` : 'Microchip: not on file',
    dog.vet_name ? `Regular clinic: ${dog.vet_name}${dog.vet_phone ? ` ${dog.vet_phone}` : ''}` : 'Regular clinic: not on file',
    ownerEmail ? `Owner: ${ownerEmail}` : null,
    '',
    'ALLERGIES AND NOTES',
    dog.allergies?.length ? dog.allergies.join(', ') : 'None logged',
    dog.notes ?? 'No owner notes.',
    '',
    'WEIGHT TREND (owner logs)',
    trend,
    '',
    'SYMPTOM TIMELINE (owner logs)',
    symptoms,
    '',
    'TREATS CHECKED',
    treats,
    '',
    'CARE SHEET',
    buildHandoffSheet(dog, ownerEmail, unit),
    '',
    'This pack is what was in the app. The clinician decides what it means.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}
