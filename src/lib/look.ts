import { callAi, photoToBase64, type AiReason, type AiSource } from './ai';
import type { Dog } from './database.types';
import { shouldRefuseLook } from './lookInterpret';

export type LookFocus = 'coat' | 'paws' | 'ears' | 'eyes' | 'body' | 'whats';

export const LOOK_FOCUSES: { id: LookFocus; label: string; prompt: string }[] = [
  { id: 'coat', label: 'Coat', prompt: 'Look at the coat and skin.' },
  { id: 'paws', label: 'Paws', prompt: 'Look at the paws and pads.' },
  { id: 'ears', label: 'Ears', prompt: 'Look at the ears.' },
  { id: 'eyes', label: 'Eyes', prompt: 'Look at the eyes.' },
  { id: 'body', label: 'Body', prompt: 'Guess body condition from this photo.' },
  { id: 'whats', label: "What's this", prompt: 'Describe what you see and what to do next.' },
];

export type LookResult = {
  title: string;
  summary: string;
  checks: string[];
  next: string;
  caution: string;
  /** False when the model saw no living dog. Local checklists assume they will photograph the dog. */
  hasDog: boolean;
  /** 'ai' when a model looked at the photo, 'local' when this is the built-in checklist. */
  source: AiSource;
  /** Why the model did not run, when source is 'local'. */
  reason?: AiReason;
};

function dogLine(dog: Dog | null) {
  if (!dog) return 'this dog';
  const bits = [dog.name, dog.breed, dog.sex !== 'unknown' ? dog.sex : null].filter(Boolean);
  return bits.join(', ');
}

export function localLook(focus: LookFocus, dog: Dog | null, reason?: AiReason): LookResult {
  const who = dogLine(dog);
  const allergy = dog?.allergies?.length ? `Known sensitivities: ${dog.allergies.join(', ')}.` : null;
  const base = {
    source: 'local' as const,
    hasDog: true,
    reason,
    caution: 'This is a photo helper, not a diagnosis. If they seem in pain, cannot breathe easily, collapse, or eat something toxic, go to a vet now.',
  };

  if (focus === 'coat') {
    return {
      ...base,
      title: 'Coat and skin',
      summary: `For ${who}, look at shine, flakes, bald patches, redness, and any smell that is not just "dog".`,
      checks: [
        'Part the fur. Pink-normal skin is fine. Bright red, yellow crust, or open sores are not.',
        'Hot spots often start as a damp, sore patch they keep licking.',
        'A sudden bald patch with a ring can be ringworm. Keep it away from other pets until a vet sees it.',
        allergy ?? 'If they scratch in the same place after a new food, log it.',
      ],
      next: 'If it is one small itchy patch, keep it clean and log it under Something off. Spreading, oozing, or they cannot leave it alone: book the vet.',
    };
  }
  if (focus === 'paws') {
    return {
      ...base,
      title: 'Paws',
      summary: `Spread ${dog?.name ?? 'their'} toes. Seeds, salt, split nails, and yeast live in the gaps.`,
      checks: [
        'Look between pads for grass seeds, glass, or a dark line that was not there.',
        'Red, brown, or a yeasty smell between toes is a common allergy or yeast flare.',
        'A nail that is split or bleeding needs a wrap and a same-day clinic if it will not stop.',
        'Limping after a walk is often a pad cut, not a joint, until you have looked.',
      ],
      next: 'Rinse with clean water, no human antiseptic. If they will not bear weight, or you see a seed track, go in.',
    };
  }
  if (focus === 'ears') {
    return {
      ...base,
      title: 'Ears',
      summary: 'A healthy ear is pale pink, mostly dry, and does not smell sweet or cheesy.',
      checks: [
        'Compare both ears. One dirty ear with a head tilt is more urgent than two mildly waxy ones.',
        'Brown crumbly wax plus head shaking often means mites in puppies.',
        'Dark, greasy, smelly wax is a classic yeast ear. Do not pour oil in.',
        'A swollen, ballooned flap is a hematoma. It will not drain itself well.',
      ],
      next: 'Wipe only what you can see with a vet ear wipe. Pain, smell, or they cry when you touch it: vet within a day.',
    };
  }
  if (focus === 'eyes') {
    return {
      ...base,
      title: 'Eyes',
      summary: 'Clear, bright, no squint. One cloudy or red eye is an emergency more often than people think.',
      checks: [
        'Squinting, pawing, or keeping the eye shut: treat as painful. Do not wait overnight.',
        'Green or yellow discharge needs a clinic. Clear tears after wind or a walk can wait if the eye is open and comfortable.',
        'A blue or milky surface that appeared suddenly can be corneal swelling.',
        'Cherry eye looks like a pink blob at the inner corner. Not an emergency, but do not poke it.',
      ],
      next: 'No drops from the medicine cabinet. If they squint or the eye looks cloudy, go today.',
    };
  }
  if (focus === 'body') {
    return {
      ...base,
      title: 'Body condition',
      summary: `Ribs should feel under a light layer. A waist from above. ${dog?.weight_kg ? `Logged weight is ${dog.weight_kg} kg.` : 'No weight logged yet.'}`,
      checks: [
        'Feel, do not only look. Fur hides a lot, especially on fluffier breeds.',
        'No waist and a sagging belly usually means extra weight, not "big boned".',
        'Ribs, spine, and hip bones sharp with no cover is too thin. Book a check if that is new.',
        'A tight, drum-like belly that came on fast is an emergency, not a body-condition photo.',
      ],
      next: 'Log a weight in Track. If the belly is tight or they are retching without bringing anything up, skip this and open Emergency.',
    };
  }
  return {
    ...base,
    title: 'What this photo can tell you',
    summary: `A still photo of ${who} is good for skin, paws, ears, stool, and swelling. It cannot hear a cough or feel a pulse.`,
    checks: [
      'Take the photo in daylight, close enough to fill the frame with the area you care about.',
      'Add a second shot from the side if you are asking about weight or a limp.',
      'Write what changed: when it started, if they ate, if they are themselves.',
      'Share the care sheet if someone else has them tonight.',
    ],
    next: 'Pick a focus above (paws, ears, coat) for a tighter checklist, or log it under Something off.',
  };
}

type ModelLook = {
  hasDog?: boolean;
  seen?: string;
  title?: string;
  summary?: string;
  checks?: string[];
  next?: string;
  caution?: string;
};

export function noDogLook(dog: Dog | null, seen?: string): LookResult {
  const name = dog?.name ?? 'your dog';
  const what = seen?.trim();
  return {
    hasDog: false,
    source: 'ai',
    title: 'No dog in this photo',
    summary: what
      ? `This looks like ${what}, not ${name}. Look only works when the dog is in the frame.`
      : `Look only works when ${name} is in the frame. This photo does not show a dog.`,
    checks: [
      'Get the dog in daylight, close enough to fill most of the picture.',
      'Point at the spot you care about: coat, paws, ears, eyes, or the whole body.',
      'A toy, a person, a room, or a random object will not get a health read.',
    ],
    next: `Retake the photo with ${name} in it.`,
    caution: 'This is a photo helper, not a diagnosis.',
  };
}

/**
 * Ask the model through the `ai` Edge Function. Quota and Premium are enforced there; when the
 * model does not run for any reason the caller still gets the local checklist, labelled as such.
 */
export async function lookAtPhoto(uri: string, focus: LookFocus, dog: Dog | null): Promise<LookResult> {
  let b64: string;
  try {
    b64 = await photoToBase64(uri);
  } catch {
    return unreadLook(dog, 'model_error');
  }
  const prompt = LOOK_FOCUSES.find((f) => f.id === focus)?.prompt ?? '';
  const res = await callAi<ModelLook>({ kind: 'look', prompt, dogLine: dogLine(dog), allergies: dog?.allergies ?? [], imageBase64: b64 });
  if (!res.ok) return unreadLook(dog, res.reason);

  const fallback = localLook(focus, dog);
  const parsed = res.result;
  if (shouldRefuseLook(parsed)) {
    const empty = noDogLook(dog, typeof parsed.seen === 'string' ? parsed.seen : undefined);
    return { ...empty, summary: parsed.summary && parsed.hasDog === false ? parsed.summary : empty.summary };
  }
  if (!parsed.summary || !Array.isArray(parsed.checks)) return unreadLook(dog, 'model_error');
  return {
    source: 'ai',
    hasDog: true,
    title: parsed.title || fallback.title,
    summary: parsed.summary,
    checks: parsed.checks.slice(0, 6),
    next: parsed.next || fallback.next,
    caution: parsed.caution || fallback.caution,
  };
}

export function unreadLook(dog: Dog | null, reason?: AiReason): LookResult {
  const name = dog?.name ?? 'your dog';
  return {
    hasDog: false,
    source: 'local',
    reason,
    title: 'Could not read this photo',
    summary: `Nothing in this frame was checked. This is not a read of ${name}.`,
    checks: [
      'Try again on a connection.',
      `Retake with ${name} filling most of the frame.`,
      'Daylight, close, and still.',
    ],
    next: `Retake with ${name} in the picture.`,
    caution: 'This is a photo helper, not a diagnosis.',
  };
}
