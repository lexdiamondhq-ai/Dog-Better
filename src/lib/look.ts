import * as FileSystem from 'expo-file-system/legacy';

import type { Dog } from './database.types';

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
};

function dogLine(dog: Dog | null) {
  if (!dog) return 'this dog';
  const bits = [dog.name, dog.breed, dog.sex !== 'unknown' ? dog.sex : null].filter(Boolean);
  return bits.join(', ');
}

export function localLook(focus: LookFocus, dog: Dog | null): LookResult {
  const who = dogLine(dog);
  const allergy = dog?.allergies?.length ? `Known sensitivities: ${dog.allergies.join(', ')}.` : null;
  const base = {
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

export async function lookAtPhoto(uri: string, focus: LookFocus, dog: Dog | null): Promise<LookResult> {
  const fallback = localLook(focus, dog);
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) return fallback;

  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const label = LOOK_FOCUSES.find((f) => f.id === focus)?.prompt ?? '';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You help a dog owner look at a photo. You are not a veterinarian. Return JSON only: {"title","summary","checks":[string],"next","caution"}. Be specific about what you see. Never invent a diagnosis. Urge a vet for pain, breathing, eye injuries, tight belly, or toxins.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `${label} Dog: ${dogLine(dog)}. Allergies: ${dog?.allergies?.join(', ') || 'none logged'}.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, '')) as LookResult;
    if (!parsed.summary || !Array.isArray(parsed.checks)) return fallback;
    return {
      title: parsed.title || fallback.title,
      summary: parsed.summary,
      checks: parsed.checks.slice(0, 6),
      next: parsed.next || fallback.next,
      caution: parsed.caution || fallback.caution,
    };
  } catch {
    return fallback;
  }
}
