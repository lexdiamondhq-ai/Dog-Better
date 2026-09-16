/**
 * Symptom triage engine.
 *
 * Deterministic and explainable on purpose: every outcome can be traced to a rule so the
 * guidance can be reviewed line by line by a veterinarian before it ships as "vet-approved".
 * It never diagnoses; it only decides how urgently a professional should be involved.
 */

export type Triage = 'green' | 'amber' | 'red';

export type Duration = 'now' | 'day' | 'days' | 'week' | 'longer';

export const DURATIONS: { id: Duration; label: string }[] = [
  { id: 'now', label: 'Just started' },
  { id: 'day', label: 'Under 24h' },
  { id: 'days', label: '1-3 days' },
  { id: 'week', label: '4-7 days' },
  { id: 'longer', label: 'Over a week' },
];

export type SymptomId =
  | 'vomiting'
  | 'diarrhea'
  | 'blood_stool'
  | 'not_eating'
  | 'not_drinking'
  | 'lethargy'
  | 'scratching'
  | 'hair_loss'
  | 'limping'
  | 'coughing'
  | 'sneezing'
  | 'breathing'
  | 'bloated'
  | 'seizure'
  | 'collapse'
  | 'thirst'
  | 'urinating_often'
  | 'straining_urine'
  | 'eye_discharge'
  | 'ear_shaking'
  | 'bad_breath'
  | 'trembling'
  | 'pale_gums'
  | 'ate_toxic'
  | 'pain';

export type Symptom = {
  id: SymptomId;
  label: string;
  group: 'Tummy' | 'Energy & appetite' | 'Skin & coat' | 'Movement' | 'Breathing' | 'Urgent signs' | 'Other';
  /** Home-care note shown when the overall triage is green/amber. */
  homeTip: string;
  /** Escalation cue shown alongside the tip. */
  watchFor: string;
  /** Immediate emergency regardless of anything else. */
  redFlag?: boolean;
};

export const SYMPTOMS: Symptom[] = [
  { id: 'vomiting', label: 'Vomiting', group: 'Tummy', homeTip: 'Withhold food for 6-8h (never water), then offer small bland meals: boiled chicken and rice.', watchFor: 'More than 2-3 episodes in a day, blood, or vomiting with a swollen belly.' },
  { id: 'diarrhea', label: 'Diarrhea', group: 'Tummy', homeTip: 'Bland diet for 2-3 days, plenty of water, a spoon of plain pumpkin can help firm things up.', watchFor: 'Black or bloody stool, or diarrhea plus vomiting.' },
  { id: 'blood_stool', label: 'Blood in stool', group: 'Tummy', homeTip: 'Note colour: bright red usually means the lower gut, black and tarry means higher up.', watchFor: 'Any black tarry stool or large volumes of blood need same-day care.' },
  { id: 'bloated', label: 'Swollen, tight belly', group: 'Urgent signs', homeTip: '', watchFor: 'Bloat (GDV) can be fatal within hours. Retching without producing anything is a classic sign.', redFlag: true },
  { id: 'not_eating', label: 'Not eating', group: 'Energy & appetite', homeTip: 'Try warming food slightly or hand-feeding. Skipping one meal is common; two or more is not.', watchFor: 'No food for 24h, or refusing water.' },
  { id: 'not_drinking', label: 'Not drinking', group: 'Energy & appetite', homeTip: 'Offer fresh water in a new bowl, ice cubes, or low-sodium broth.', watchFor: 'Dry sticky gums or skin that stays tented when pinched = dehydration.' },
  { id: 'lethargy', label: 'Low energy', group: 'Energy & appetite', homeTip: 'Rest day, cool quiet spot, keep water close. Note whether it improves after sleep.', watchFor: 'Cannot be roused, wobbling, or combined with vomiting or pale gums.' },
  { id: 'thirst', label: 'Very thirsty', group: 'Energy & appetite', homeTip: 'Measure the water bowl for a day. More than ~100 ml per kg per day is excessive.', watchFor: 'Paired with weight loss or frequent urination; can signal diabetes or kidney issues.' },
  { id: 'scratching', label: 'Scratching or licking', group: 'Skin & coat', homeTip: 'Check for fleas, look between toes and in armpits. An oatmeal bath soothes most itchy skin.', watchFor: 'Raw, weeping, or bleeding skin, or scratching that stops sleep.' },
  { id: 'hair_loss', label: 'Hair loss or bald patches', group: 'Skin & coat', homeTip: 'Photograph the patch daily so you can show the vet how it is changing.', watchFor: 'Circular patches (possible ringworm, which spreads to people) or crusting.' },
  { id: 'ear_shaking', label: 'Head shaking or ear scratching', group: 'Skin & coat', homeTip: 'Look inside: dark waxy debris or a yeasty smell means an ear infection that needs a prescription.', watchFor: 'Head tilt, loss of balance, or a swollen ear flap.' },
  { id: 'bad_breath', label: 'Bad breath', group: 'Other', homeTip: 'Lift the lip and check for red gums or brown tartar. Start gentle daily brushing.', watchFor: 'Drooling, dropping food, or a sweet or ammonia smell on the breath.' },
  { id: 'limping', label: 'Limping', group: 'Movement', homeTip: 'Strict rest, no stairs or jumping. Check paw pads for cuts, thorns, or torn nails.', watchFor: 'Not bearing any weight, swelling, or a limp lasting more than 48h.' },
  { id: 'trembling', label: 'Shaking or trembling', group: 'Movement', homeTip: 'Rule out cold, fear, or excitement first. Keep them warm and calm.', watchFor: 'Trembling with vomiting, stiffness, or after possibly eating something unusual.' },
  { id: 'pain', label: 'Crying or flinching when touched', group: 'Movement', homeTip: 'Never give human painkillers. Ibuprofen and acetaminophen are toxic to dogs.', watchFor: 'Hunched posture, a rigid belly, or reluctance to lie down.' },
  { id: 'coughing', label: 'Coughing', group: 'Breathing', homeTip: 'Use a harness instead of a collar. A humidifier helps a dry honking cough (often kennel cough).', watchFor: 'Coughing up blood or foam, or cough with laboured breathing.' },
  { id: 'sneezing', label: 'Sneezing or runny nose', group: 'Breathing', homeTip: 'Occasional sneezes are normal. Check for grass seeds if the sneezing is sudden and violent.', watchFor: 'Bloody or one-sided discharge, or sneezing that will not stop.' },
  { id: 'breathing', label: 'Trouble breathing', group: 'Urgent signs', homeTip: '', watchFor: 'Open-mouth breathing at rest, blue or grey gums, or stretched neck breathing.', redFlag: true },
  { id: 'seizure', label: 'Seizure', group: 'Urgent signs', homeTip: '', watchFor: 'Keep them away from stairs and furniture, do not hold the mouth, time the episode.', redFlag: true },
  { id: 'collapse', label: 'Collapsed or cannot stand', group: 'Urgent signs', homeTip: '', watchFor: 'Check gum colour and breathing while someone calls the vet.', redFlag: true },
  { id: 'pale_gums', label: 'Pale, white, or blue gums', group: 'Urgent signs', homeTip: '', watchFor: 'Can mean internal bleeding, shock, or poor oxygen. Go now.', redFlag: true },
  { id: 'straining_urine', label: 'Straining to pee', group: 'Urgent signs', homeTip: '', watchFor: 'A blocked bladder, especially in males, is an emergency within hours.', redFlag: true },
  { id: 'ate_toxic', label: 'Ate something toxic', group: 'Urgent signs', homeTip: '', watchFor: 'Bring the packaging. Do not induce vomiting unless a vet tells you to.', redFlag: true },
  { id: 'urinating_often', label: 'Peeing more often', group: 'Other', homeTip: 'Collect a fresh urine sample in a clean container for the vet.', watchFor: 'Blood in urine, accidents indoors, or straining.' },
  { id: 'eye_discharge', label: 'Eye discharge or squinting', group: 'Other', homeTip: 'Wipe with a warm damp cloth from inner to outer corner. Never use human eye drops.', watchFor: 'Squinting, cloudiness, or pawing at the eye can mean an ulcer.' },
];

/** Display order: emergencies first, the catch-all bucket last. */
export const SYMPTOM_GROUPS: Symptom['group'][] = ['Urgent signs', 'Tummy', 'Energy & appetite', 'Skin & coat', 'Movement', 'Breathing', 'Other'];

export type TriageInput = {
  symptoms: SymptomId[];
  severity: 1 | 2 | 3 | 4 | 5;
  duration: Duration;
  /** Puppies (< 1 yr) and seniors (> 8 yrs) escalate faster. */
  ageYears?: number | null;
  /** "Something is off but I cannot name it." Documents and sets a watch window instead of guessing. */
  unsure?: boolean;
};

export type TriageResult = {
  triage: Triage;
  title: string;
  guidance: string;
  reasons: string[];
  tips: { label: string; homeTip: string; watchFor: string }[];
};

const durationRank: Record<Duration, number> = { now: 0, day: 1, days: 2, week: 3, longer: 4 };

export function runTriage(input: TriageInput): TriageResult {
  const picked = SYMPTOMS.filter((s) => input.symptoms.includes(s.id));
  const reasons: string[] = [];
  const has = (id: SymptomId) => input.symptoms.includes(id);
  const d = durationRank[input.duration];
  const vulnerable = input.ageYears != null && (input.ageYears < 1 || input.ageYears > 8);

  const rank: Record<Triage, number> = { green: 0, amber: 1, red: 2 };
  const state: { triage: Triage } = { triage: 'green' };
  const escalate = (level: Triage, why: string) => {
    if (rank[level] > rank[state.triage]) state.triage = level;
    reasons.push(why);
  };
  const at = (level: Triage) => state.triage === level;

  for (const s of picked) if (s.redFlag) escalate('red', `${s.label} is an emergency sign.`);

  if (has('vomiting') && has('diarrhea') && input.severity >= 4) escalate('red', 'Severe vomiting with diarrhea risks rapid dehydration.');
  if (has('blood_stool') && has('vomiting')) escalate('red', 'Bloody stool together with vomiting needs same-day care.');
  if (has('not_drinking') && d >= 1) escalate('red', 'Not drinking for a day or more is dangerous.');
  if (has('vomiting') && input.severity === 5) escalate('red', 'Relentless vomiting cannot wait.');
  if (has('lethargy') && has('pale_gums')) escalate('red', 'Weakness with pale gums suggests shock or bleeding.');

  if (has('vomiting') && (d >= 1 || input.severity >= 3)) escalate('amber', 'Vomiting that is persistent or moderate should be seen within 24h.');
  if (has('diarrhea') && (d >= 2 || input.severity >= 3)) escalate('amber', 'Diarrhea lasting days or moderate in severity needs a vet check.');
  if (has('blood_stool')) escalate('amber', 'Blood in the stool always warrants a call.');
  if (has('not_eating') && d >= 1) escalate('amber', 'Skipping food for 24h is a red flag in dogs.');
  if (has('limping') && (input.severity >= 3 || d >= 2)) escalate('amber', 'A limp that is painful or lasting more than 48h needs an exam.');
  if (has('coughing') && d >= 2) escalate('amber', 'A cough lasting days can be infection or heart related.');
  if (has('eye_discharge') && input.severity >= 3) escalate('amber', 'Painful eyes can ulcerate quickly.');
  if (has('thirst') && has('urinating_often')) escalate('amber', 'Thirst with frequent urination should be blood-tested.');
  if (has('ear_shaking') && d >= 1) escalate('amber', 'Ear infections rarely resolve without treatment.');
  if (has('trembling') && input.severity >= 3) escalate('amber', 'Persistent trembling should be checked.');
  if (has('pain')) escalate('amber', 'Pain on touch deserves a proper exam.');
  if (has('hair_loss') && d >= 2) escalate('amber', 'Spreading hair loss can be contagious or hormonal.');
  if (has('lethargy') && (d >= 2 || input.severity >= 4)) escalate('amber', 'Low energy that lasts is never normal.');
  if (picked.length >= 3 && at('green')) escalate('amber', 'Three or more symptoms together deserve a call.');
  if (input.severity >= 4 && at('green')) escalate('amber', 'You rated this as severe, trust that instinct.');
  if (vulnerable && at('amber') && input.severity >= 4) escalate('red', 'Puppies and seniors decline faster, so we bumped urgency.');
  if (vulnerable && at('green') && picked.length > 0 && d >= 2) escalate('amber', 'Puppies and seniors should be seen sooner.');

  if (input.unsure) {
    if (input.severity >= 4 || d >= 2) escalate('amber', 'You feel something is wrong and it is either marked or has lasted days. Owners notice before tests do; a call is the right move.');
    else if (vulnerable) escalate('amber', 'With a puppy or senior, "not quite right" is worth a same-day call.');
    else reasons.push('Nothing specific yet. The useful move is to document: a note, a photo or short video, and a re-check in 12 hours.');
  }

  if (reasons.length === 0 && picked.length > 0) reasons.push('Mild, recent, and isolated: safe to monitor at home for now.');

  const copy: Record<Triage, { title: string; guidance: string }> = {
    green: {
      title: 'Monitor at home',
      guidance: 'This looks manageable at home for the next 24-48 hours. Keep notes, keep water available, and re-check here if anything changes.',
    },
    amber: {
      title: 'Call your vet today',
      guidance: 'This should be seen within 24 hours. Phone your clinic, describe what you logged here, and follow their advice on timing.',
    },
    red: {
      title: 'Go to a vet now',
      guidance: 'Treat this as an emergency. Call ahead so they can prepare, and bring any packaging of anything eaten.',
    },
  };

  const triage = state.triage;
  const tips = picked.filter((s) => !s.redFlag || triage !== 'red').map((s) => ({ label: s.label, homeTip: s.homeTip, watchFor: s.watchFor }));
  if (input.unsure && triage === 'green') {
    tips.unshift({
      label: 'Not sure what it is',
      homeTip: 'Write down what you noticed and when. Take a 15-second video of the behaviour. Check again in 12 hours and log whether it is the same, better, or worse.',
      watchFor: 'Not eating, not drinking, vomiting, laboured breathing, pale gums, collapse, or a swollen belly. Any of these means call now.',
    });
  }
  return { triage, ...copy[triage], reasons, tips };
}
