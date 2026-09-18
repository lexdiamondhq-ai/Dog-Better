import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * The only place Dog Better talks to a model. The OpenAI key lives here as a secret, never in the
 * app bundle. Free users get FREE_LOOKS_PER_DAY Look calls; Premium (profiles.premium_until, written by
 * the RevenueCat webhook) gets PREMIUM_LOOKS_PER_DAY. Visit-sheet reads are Premium only.
 *
 * Look is two model calls: first a dog-gate that never sees the household breed, then a health
 * read only if a living dog is in the frame.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const FREE_LOOKS_PER_DAY = 3;
const PREMIUM_LOOKS_PER_DAY = 40;
const MAX_IMAGE_B64 = 6_000_000;

type LookBody = { kind: 'look'; prompt: string; dogLine: string; allergies: string[]; imageBase64: string };
type SheetBody = { kind: 'sheet'; dogLine: string; text?: string; imageBase64?: string };
type Body = LookBody | SheetBody;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const GATE_SYSTEM =
  'You only decide what is in a photo. Return JSON only: {"hasDog":boolean,"seen":"two to five words"}. ' +
  'hasDog is true only if a living dog is clearly visible (muzzle, ear, eye, paw, or body). ' +
  'False for laptops, phones, furniture, people, rooms, food, toys, drawings, cartoons, and other animals. ' +
  'seen is the main subject you actually see, such as "silver laptop" or "black dog". ' +
  'Do not invent a pet. Do not name a breed unless a dog is visible.';

const LOOK_SYSTEM =
  'You help a dog owner look at a photo of a dog that is already confirmed to be in the frame. You are not a veterinarian. ' +
  'Return JSON only: {"hasDog":true,"seen","title","summary","checks":[string],"next","caution"}. ' +
  'Describe only what you see. Household dog is context. Never invent a diagnosis. ' +
  'Urge a vet for pain, breathing, eye injuries, tight belly, or toxins.';

const SHEET_SYSTEM =
  'Extract medications and feeding times from a veterinary discharge. You are not a veterinarian. Never invent a drug, dose, time, or duration. If a field is not written, omit it or use null. Do not default times to 08:00 or days to 7. If the sheet lists tablet strength and a separate give amount, put the give amount in dose and the strength in note. JSON only: {"medications":[{"name","dose":null,"times":[],"withFood":false,"days":null,"note":null}],"meals":[{"time":"HH:MM","label":"Breakfast","days":null}]}';

function emptyLook(seen: string) {
  return {
    hasDog: false,
    seen,
    title: 'No dog in this photo',
    summary: seen
      ? `This photo shows ${seen}, not a dog. Look needs the dog in the frame.`
      : 'Look needs the dog in the frame. This photo does not show a dog.',
    checks: ['Get the dog in daylight.', 'Fill most of the frame with the dog or the spot you care about.', 'Hold still.'],
    next: 'Retake with the dog in the picture.',
    caution: 'This is a photo helper, not a diagnosis.',
  };
}

async function askModel(system: string, content: unknown[], temperature: number) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('openai_empty');
  return JSON.parse(raw.replace(/^```json\s*|```$/g, '')) as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (body.kind !== 'look' && body.kind !== 'sheet') return json({ error: 'bad_request' }, 400);
  const image = 'imageBase64' in body ? body.imageBase64 : undefined;
  if (image && image.length > MAX_IMAGE_B64) return json({ error: 'image_too_large' }, 413);

  if (!OPENAI_KEY) return json({ ok: false, source: 'local', reason: 'not_configured' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: profile } = await admin.from('profiles').select('premium_until').eq('id', uid).maybeSingle();
  const premium = !!profile?.premium_until && new Date(profile.premium_until as string).getTime() > Date.now();

  if (body.kind === 'sheet' && !premium) return json({ ok: false, source: 'local', reason: 'premium_required' }, 402);

  let chargedLook = false;
  if (body.kind === 'look') {
    const cap = premium ? PREMIUM_LOOKS_PER_DAY : FREE_LOOKS_PER_DAY;
    const { data: used } = await admin.rpc('consume_ai_use', { p_user: uid, p_kind: 'look', p_cap: cap });
    if (used === -1 || used == null) return json({ ok: false, source: 'local', reason: 'quota', remaining: 0 }, 429);
    chargedLook = true;
  }

  try {
    if (body.kind === 'look') {
      const gate = await askModel(
        GATE_SYSTEM,
        [
          { type: 'text', text: 'Is a living dog clearly visible? What is the main subject?' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } },
        ],
        0,
      );
      const hasDog = gate.hasDog === true;
      const seen = typeof gate.seen === 'string' ? gate.seen : '';
      if (!hasDog) return json({ ok: true, source: 'ai', result: emptyLook(seen) });

      const result = await askModel(
        LOOK_SYSTEM,
        [
          {
            type: 'text',
            text: `${body.prompt} A living dog is already confirmed in this photo. Household context only: ${body.dogLine}. Allergies on file: ${body.allergies?.join(', ') || 'none logged'}.`,
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } },
        ],
        0.2,
      );
      return json({ ok: true, source: 'ai', result: { ...result, hasDog: true, seen: seen || result.seen } });
    }

    const content: unknown[] = [];
    if (body.text) content.push({ type: 'text', text: `Discharge text:\n${body.text.slice(0, 8000)}\nDog: ${body.dogLine}.` });
    if (body.imageBase64) {
      content.push({ type: 'text', text: `Read this clinic discharge or vaccine card for ${body.dogLine}. Extract only medications and meal times that are written.` });
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } });
    }
    if (!content.length) return json({ error: 'bad_request' }, 400);
    const result = await askModel(SHEET_SYSTEM, content, 0);
    return json({ ok: true, source: 'ai', result });
  } catch (e) {
    if (chargedLook) {
      await admin.rpc('refund_ai_use', { p_user: uid, p_kind: 'look' });
    }
    console.error('ai failed', body.kind, e);
    return json({ ok: false, source: 'local', reason: 'model_error' }, 502);
  }
});
