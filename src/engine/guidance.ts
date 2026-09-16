import type { Dog, HealthLog } from '@/lib/database.types';
import type { WeightUnit } from '@/lib/preferences';
import { formatWeight } from '@/lib/units';

export type Guide = {
  id: string;
  title: string;
  why: string;
  body: string[];
  tone: 'brand' | 'good' | 'warn' | 'bad' | 'info';
};

export type Tip = { id: string; title: string; body: string; topic: 'training' | 'health' | 'enrichment' | 'safety' | 'routine'; premium?: boolean };

/** First five stay free. The rest of the catalog rotates for Premium. */
export const FREE_SESSION_LIMIT = 5;

/** Short, practical, evergreen. One session a night. Fifty-plus in the wheel. */
export const TIPS: Tip[] = [
  { id: 'name-game', topic: 'training', title: 'Make their name mean good things', body: 'Say the name once, then a treat, ten times a day for a week. Never use it for scolding. A name that always predicts something good becomes the fastest recall you own.' },
  { id: 'four-on-floor', topic: 'training', title: 'Jumping: reward the floor, not the jump', body: 'Turn away when paws come up, treat the instant all four are down. Guests get the same instruction. Consistency from everyone beats intensity from one person.' },
  { id: 'leash-stop', topic: 'training', title: 'Pulling: be a tree', body: 'The moment the leash goes tight, stop walking. Move again only when it slackens. Boring for you for a week, life-changing after.' },
  { id: 'sniff-walk', topic: 'enrichment', title: 'Let one walk a day be a sniff walk', body: 'Twenty minutes of sniffing tires a dog more than forty minutes of marching. Pick a slow route and let them lead their nose.' },
  { id: 'paw-check', topic: 'health', title: 'Weekly paw check, thirty seconds', body: 'Spread the toes, look between pads for redness, grass seeds, or a yeasty smell. Catching it early is the whole game with paws.' },
  { id: 'gum-colour', topic: 'health', title: 'Know their normal gum colour', body: 'Lift the lip today while they are healthy. Pink is normal for most dogs. Pale, white, blue, or brick red later is a same-day vet sign you will now recognise.', premium: true },
  { id: 'hot-pavement', topic: 'safety', title: 'The seven-second test', body: 'Back of your hand on the pavement for seven seconds. If you cannot hold it there, it is too hot for paws. Walk early or on grass.', premium: true },
  { id: 'toxic-list', topic: 'safety', title: 'Five things that are never a treat', body: 'Grapes and raisins, onions and garlic, xylitol, chocolate, cooked bones. Check labels. The scanner does this for you in the aisle.', premium: true },
  { id: 'routine-anchor', topic: 'routine', title: 'Anchor the day with two fixed points', body: 'Same wake walk, same dinner time. Everything else can move. Dogs tolerate change far better when two anchors hold.', premium: true },
  { id: 'dinner-puzzle', topic: 'enrichment', title: 'Feed dinner from a puzzle, not a bowl', body: 'Same food, same calories, ten more minutes of brain work. Start easy so they win. Frustration is not enrichment.', premium: true },
  { id: 'freeze-it', topic: 'enrichment', title: 'Freeze the lick mat', body: 'Plain yoghurt or wet food, frozen, lasts three times longer. It calms most dogs. Perfect for the hour you are on a call.', premium: true },
  { id: 'water-math', topic: 'health', title: 'How much water is too much', body: 'More than about 100 ml per kilo per day, consistently, is worth a vet conversation. Measure the bowl for a day if you are unsure. Log it in Track.', premium: true },
  { id: 'body-condition', topic: 'health', title: 'Ribs: feel but not see', body: 'You should feel ribs under a light layer with flat fingers. You should see a waist from above. If you have to press, the treats are winning.', premium: true },
  { id: 'car-heat', topic: 'safety', title: 'A parked car is never for a minute', body: 'At 22 C outside, a car interior passes 40 C in ten minutes. Windows cracked change almost nothing. Take them in or leave them home.', premium: true },
  { id: 'calm-return', topic: 'routine', title: 'Come home boring', body: 'Big greetings teach a dog that your return is the day peak. That makes your absence the pit. Quiet hello, then attention a minute later.', premium: true },
  { id: 'nail-touch', topic: 'training', title: 'Touch the clippers to a nail, then treat', body: 'No clipping for a week. Just touch, treat, done. When they lean into it, trim one nail.', premium: true },
  { id: 'photo-baseline', topic: 'health', title: 'Take the boring photos', body: 'Ears, belly, both sides standing, once a month. Nothing is more useful at the vet than a normal from March. Save them in the vault.', premium: true },
  { id: 'settle-mat', topic: 'training', title: 'A mat that means settle', body: 'Treat every time they lie on it, for two weeks, anywhere in the house. You now have a portable off switch. Cafes, visits, and vets get easier.', premium: true },
  { id: 'leave-it', topic: 'training', title: 'Leave it: cover, wait, trade', body: 'Put a treat under your hand. When they stop pawing, mark and feed a better treat from the other hand. Then uncover and let them take the first one on cue.', premium: true },
  { id: 'drop-it', topic: 'training', title: 'Drop it is a trade, not a tug', body: 'Offer a higher-value treat next to the thing in their mouth. The second they open, they get the treat and you pick up the prize. Play tug again so dropping never ends the fun.', premium: true },
  { id: 'wait-door', topic: 'training', title: 'Wait at the door, then release', body: 'Hand on the latch. If they step forward, close it. When they sit or stand still, open two inches, then their release word, then through.', premium: true },
  { id: 'recall-rounds', topic: 'training', title: 'Recall in rounds, not lectures', body: 'Two people, ten metres apart. Call once, treat a jackpot when they arrive, then the other person calls. Stop at five wins.', premium: true },
  { id: 'chin-rest', topic: 'training', title: 'Chin rest for ears and eyes', body: 'Hold your palm under their chin. Treat for two seconds of contact, then five. Then keep the chin there while the other hand touches an ear.', premium: true },
  { id: 'find-it', topic: 'enrichment', title: 'Find it: hide dinner in the room', body: 'Scatter half the meal in easy sight. Then under a towel. Then in two rooms. End while they still want one more search.', premium: true },
  { id: 'crate-down', topic: 'routine', title: 'Crate as a rest, not a timeout', body: 'Feed one meal in the crate with the door open for a week. Then close for the last three bites. Never send them there angry.', premium: true },
  { id: 'loose-uturn', topic: 'training', title: 'Pulling: turn before they hit the end', body: 'The instant they surge, turn 180 and walk the other way. Treat when they catch up on a slack leash. Turns teach them to watch you.', premium: true },
  { id: 'impulse-bowl', topic: 'training', title: 'Wait for the bowl to land', body: 'Bowl in both hands. Lower an inch. If they lunge, lift it. When they hold still, set it down and release.', premium: true },
  { id: 'quiet-on-cue', topic: 'training', title: 'Quiet after the bark, not during', body: 'Let one or two alert barks happen. Then a treat at their nose the moment they pause. Say quiet as they eat.', premium: true },
  { id: 'watch-me', topic: 'training', title: 'Watch me: two seconds of eyes', body: 'Hold a treat at your nose. Mark the instant they glance up. Feed, then ask for two seconds before the treat lands.', premium: true },
  { id: 'hand-target', topic: 'training', title: 'Touch: nose to an open palm', body: 'Present your palm a few inches away. Mark the tap. Step back a pace and ask again so they come to you.', premium: true },
  { id: 'middle', topic: 'training', title: 'Middle: between your legs', body: 'Lure them through your stance with a treat. Mark when both shoulders are between your knees. This is a reset on a busy sidewalk.', premium: true },
  { id: 'stay-three', topic: 'training', title: 'Stay for three quiet seconds', body: 'Ask for a sit. Open hand, take one step back. Return and treat before they break. Add a second only when three is easy.', premium: true },
  { id: 'handshake', topic: 'training', title: 'A paw that is offered, not grabbed', body: 'Wait for any paw lift. Mark and treat. Say paw as it happens, never while you yank the foot.', premium: true },
  { id: 'spin', topic: 'training', title: 'Spin: a tight happy circle', body: 'Lure a treat around their nose in a small circle. Mark when they complete it. Fade the lure to a finger swirl.', premium: true },
  { id: 'tug-rules', topic: 'training', title: 'Tug with an off switch', body: 'Play hard for ten seconds. Then freeze and wait for the drop. Restart tug so the game is the prize, not the steal.', premium: true },
  { id: 'fetch-drop', topic: 'training', title: 'Fetch that ends in your hand', body: 'Two toys. When they bring one, show the second. They drop to play again. Never chase the first toy.', premium: true },
  { id: 'harness-on', topic: 'training', title: 'Harness goes on like a treat', body: 'Treat for sniffing the harness. Treat for one paw through. Treat for the clip. Walk starts after, never as a wrestling match.', premium: true },
  { id: 'collar-grab', topic: 'training', title: 'A hand on the collar is good news', body: 'Reach, touch the collar, treat. Repeat until they lean in. You now have a safe grab at the park gate.', premium: true },
  { id: 'car-load', topic: 'training', title: 'Load the car on a cue', body: 'Treat for looking at the open door. Treat for two paws up. Treat for all four, then release out again so the car is not a trap.', premium: true },
  { id: 'scale-stand', topic: 'training', title: 'Stand still on the bathroom scale', body: 'Treat for two paws on. Treat for four. Hold three seconds, treat, done. Weigh weekly after this is easy.', premium: true },
  { id: 'toothbrush', topic: 'health', title: 'Toothbrush is a lick, not a fight', body: 'Let them lick dog toothpaste off the brush. Touch one canine. Stop. Tomorrow, two teeth.', premium: true },
  { id: 'ear-wipe', topic: 'health', title: 'Ear wipe with a chin rest', body: 'Chin in your palm. Show the wipe, treat. Touch the flap, treat. One swipe only, then a jackpot.', premium: true },
  { id: 'coat-brush', topic: 'health', title: 'Five strokes, then freedom', body: 'Brush the easy spot first. Five strokes, treat, release. Build to the mats only after the easy spots are boring.', premium: true },
  { id: 'eye-wipe', topic: 'health', title: 'Wipe the corners, then play', body: 'Damp cloth, one corner, treat. Other corner, treat. Stop before they squirm. Daily beats a crusty week.', premium: true },
  { id: 'id-check', topic: 'safety', title: 'Tags and chip, ninety seconds', body: 'Read the tag aloud. Confirm the number in the vault. If the tag is silent, replace it before the next walk.', premium: true },
  { id: 'shade-check', topic: 'safety', title: 'Pick the shady third of the walk', body: 'Look at the route before you leave. Plan two shade pauses. Water at the first one, even if they look fine.', premium: true },
  { id: 'bike-pass', topic: 'safety', title: 'Bikes get a sit, not a lunge', body: 'Sit as the bike appears. Treat as it passes. If they break, more distance next time, not a scold.', premium: true },
  { id: 'wildlife-watch', topic: 'safety', title: 'Squirrels: watch me, then walk on', body: 'The second they lock on, say their name once. Treat for any glance back. Then move. You are teaching the unstick, not a debate.', premium: true },
  { id: 'doorbell-settle', topic: 'routine', title: 'Doorbell means the mat', body: 'Ring it yourself. Lure to the mat. Treat for lying there while you open a pretend door. Guests get the same script.', premium: true },
  { id: 'guest-leash', topic: 'routine', title: 'Guests meet on a short leash', body: 'Leash on before the knock. Four on the floor earns a treat from you, not from the guest. Guest stands still until the leash slackens.', premium: true },
  { id: 'bedtime-wind', topic: 'routine', title: 'Last ten minutes are dim', body: 'Lights down. One sniff toy or lick mat. No wrestle. Sleep comes easier when the day has a landing.', premium: true },
  { id: 'morning-reset', topic: 'routine', title: 'Potty before coffee, then breakfast', body: 'Out first, even if it is raining. Then the meal. The bladder wins more mornings when the order never flips.', premium: true },
  { id: 'chew-rotate', topic: 'enrichment', title: 'Rotate three chews, hide two', body: 'Put two chews away. Offer the third for fifteen minutes. Swap tomorrow. Novelty is the toy.', premium: true },
  { id: 'muffin-tin', topic: 'enrichment', title: 'Kibble in a muffin tin', body: 'Drop breakfast in the cups. Cover two cups with tennis balls. They move the balls. That is a work-to-eat morning.', premium: true },
  { id: 'towel-sniff', topic: 'enrichment', title: 'Rainy day: a scented towel', body: 'Rub a towel on grass or a safe herb. Hide it in the room. Let them hunt. Indoor nose work, no mud.', premium: true },
  { id: 'box-search', topic: 'enrichment', title: 'Treats in a cardboard box', body: 'Open box, easy treats. Then loosely close the flaps. They shred to earn dinner. Recycle the box after.', premium: true },
  { id: 'flirt-rules', topic: 'enrichment', title: 'Flirt pole: chase, then down', body: 'Ten seconds of chase. Then lure a down and rest. Repeat three times. The rest is the point, or they never come down.', premium: true },
  { id: 'cafe-settle', topic: 'routine', title: 'Cafe: mat, then people-watching', body: 'Mat under the table. Treat every thirty seconds of lying down. Leave while they are still winning. First cafe is five minutes.', premium: true },
  { id: 'vet-lobby', topic: 'routine', title: 'Vet lobby as a training field', body: 'Go when you have no appointment. Sit, treat, leave. The building predicts cheese, not only needles.', premium: true },
  { id: 'pill-practice', topic: 'health', title: 'Empty pill pocket, then the real one', body: 'Pocket with only paste, three days. Then the pill inside. Chase with a second treat so they never hunt the pocket.', premium: true },
  { id: 'potty-cue', topic: 'routine', title: 'One word for potty, then party', body: 'Say the word as they start, not after. Jackpot when they finish. Same word in new places so travel is not a mystery.', premium: true },
  { id: 'water-walk', topic: 'safety', title: 'Offer water at minute fifteen', body: 'Bring a bottle even on a short loop. Offer, do not pour. A skip today is fine. A skip every walk is a note for the vet.', premium: true },
];

/** Deterministic daily rotation so everyone in a household sees the same three on the same day. */
export type Tonight = { kind: 'guide'; guide: Guide } | { kind: 'tip'; tip: Tip };

export type Session = {
  id: string;
  title: string;
  why: string;
  topic: Tip['topic'];
  steps: string[];
};

function stepsFromTip(tip: Tip): string[] {
  const parts = tip.body
    .split('. ')
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .map((s) => (s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : `${s}.`));
  return parts.length >= 2 ? parts : [tip.body];
}

function topicForGuide(id: string): Tip['topic'] {
  if (id === 'puppy') return 'training';
  if (id === 'labels' || id === 'itch' || id === 'gut' || id === 'senior' || id === 'treats' || id.includes('treat')) return 'health';
  return 'enrichment';
}

export function sessionFromTonight(tonight: Tonight): Session {
  if (tonight.kind === 'guide') {
    return {
      id: tonight.guide.id,
      title: tonight.guide.title,
      why: tonight.guide.why,
      topic: topicForGuide(tonight.guide.id),
      steps: tonight.guide.body,
    };
  }
  return {
    id: tonight.tip.id,
    title: tonight.tip.title,
    why: `${tonight.tip.body.split(/[.!?]/)[0]}.`,
    topic: tonight.tip.topic,
    steps: stepsFromTip(tonight.tip),
  };
}

export function catalog(isPremium: boolean): Tip[] {
  return isPremium ? TIPS : TIPS.filter((tip) => !tip.premium);
}

/** One session for tonight. A profile-specific guide if there is one; otherwise today's rotating tip. */
export function selectTonight(
  dog: Dog | null,
  health: HealthLog[],
  date = new Date(),
  weightUnit: WeightUnit = 'lb',
  isPremium = false,
): Tonight {
  const guides = selectGuides(dog, health, weightUnit).filter((g) => g.id !== 'start');
  if (guides[0]) return { kind: 'guide', guide: guides[0] };
  return { kind: 'tip', tip: tipsForToday(date, 1, isPremium)[0] };
}

export function tipsForToday(date = new Date(), count = 3, isPremium = false): Tip[] {
  const pool = catalog(isPremium);
  const day = Math.floor(date.getTime() / 86400000);
  const start = day % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

/**
 * Learn is not a library. Every card here exists because of something in this dog's profile or
 * recent logs, and each card says why it is being shown. If nothing applies, the list is short.
 */
export function selectGuides(dog: Dog | null, health: HealthLog[], weightUnit: WeightUnit = 'lb'): Guide[] {
  if (!dog) return [];
  const out: Guide[] = [];
  const ageYears = dog.birthdate ? (Date.now() - new Date(dog.birthdate).getTime()) / (365.25 * 86400000) : null;
  const allergies = (dog.allergies ?? []).map((a) => a.toLowerCase());
  const recent = health.filter((h) => Date.now() - new Date(h.created_at).getTime() < 14 * 86400000);
  const symptoms = new Set(recent.flatMap((h) => h.symptoms));

  if (allergies.length) {
    out.push({
      id: 'labels',
      title: `Reading labels for ${allergies.slice(0, 2).join(' and ')}`,
      why: `${dog.name} has ${allergies.length} logged ${allergies.length === 1 ? 'sensitivity' : 'sensitivities'}.`,
      body: [
        'Ingredients are listed by weight. The first five tell you what the food mostly is.',
        `"Meat meal", "animal digest", and "natural flavour" can hide ${allergies[0]}. Treat them as unknown until the brand confirms.`,
        'Dental chews, pill pockets, and flavoured medications count too. Check them once and note it in the profile.',
        'Use the treat scanner before a new treat. It flags these ingredients automatically.',
      ],
      tone: 'warn',
    });
  }

  if (symptoms.has('scratching') || symptoms.has('ear_shaking') || symptoms.has('hair_loss')) {
    out.push({
      id: 'itch',
      title: 'Itching: separating food from environment',
      why: 'Skin or ear signs were logged in the last two weeks.',
      body: [
        'Environmental itch usually follows walks, seasons, and grass. Food itch is steadier and often shows up as ear and paw trouble together.',
        'Rinse paws after grass walks for a week and log whether licking drops. That is one variable changed at a time.',
        'Photograph the same paw or ear spot every two days. Trend beats memory.',
        'If the skin is raw, weeping, or smells yeasty, that is a vet visit, not a home experiment.',
      ],
      tone: 'warn',
    });
  }

  if (symptoms.has('vomiting') || symptoms.has('diarrhea') || symptoms.has('blood_stool')) {
    out.push({
      id: 'gut',
      title: 'Tummy resets that actually work',
      why: 'A digestive symptom was logged recently.',
      body: [
        'Skip one meal (never water). Then feed small bland meals, boiled chicken or white fish with rice, three to four times a day for two days.',
        'Note anything scavenged on walks and any new treat in the last 72 hours. Log it in Track so the detective can use it.',
        'Black, tarry stool, repeated vomiting, or a tight swollen belly are same-day vet signs.',
      ],
      tone: 'bad',
    });
  }

  if (ageYears != null && ageYears < 1) {
    out.push({
      id: 'puppy',
      title: `Socialisation window at ${Math.round(ageYears * 12)} months`,
      why: 'Puppies under a year have age-specific priorities.',
      body: [
        'Until about 16 weeks, calm exposure matters more than obedience: surfaces, sounds, handling, other vaccinated dogs.',
        'Two short sessions a day beat one long one. End while they are still winning.',
        'Handle paws, ears, and mouth daily for a few seconds with a treat. Future nail trims and vet visits depend on it.',
      ],
      tone: 'good',
    });
  }

  if (ageYears != null && ageYears >= 8) {
    out.push({
      id: 'senior',
      title: 'Senior baseline: what to watch monthly',
      why: `${dog.name} is ${Math.floor(ageYears)}, which counts as senior for most breeds.`,
      body: [
        'Stairs, jumping into the car, and getting up after sleep. Hesitation is the first sign of joint pain.',
        'Water intake and night-time restlessness. Both shift quietly with kidney and cognitive changes.',
        'Log weight monthly. A steady loss without diet change is a vet conversation.',
        'Keep a "good day" note. It helps you and your vet see the whole picture, not only the hard days.',
      ],
      tone: 'info',
    });
  }

  if (dog.weight_kg) {
    out.push({
      id: 'treats',
      title: 'Treats inside the calorie budget',
      why: `Sized to ${formatWeight(dog.weight_kg, weightUnit)}.`,
      body: [
        'Treats should stay under 10% of daily calories. The Track tab shows the number for this weight.',
        'Use part of the regular meal in puzzle toys instead of extra treats. Same fun, no extra calories.',
        'Training treats: pea-sized, and count them. Twenty tiny pieces still add up.',
      ],
      tone: 'good',
    });
  }

  if (!out.length) {
    out.push({
      id: 'start',
      title: 'Start with a week of tracking',
      why: 'Guidance here gets specific once there is something to work from.',
      body: ['Log meals and anything unusual for seven days.', 'Add weight and allergies in the profile.', 'Take one photo of paws and ears as a baseline.'],
      tone: 'brand',
    });
  }

  return out;
}
