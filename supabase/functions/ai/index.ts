import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * The only place Dog Better talks to a model. The OpenAI key lives here as a secret, never in the
 * app bundle. Free users get FREE_LOOKS_PER_DAY Look calls; Premium (profiles.premium_until, written by
 * the RevenueCat webhook) is unlimited. Visit-sheet reads are Premium only.
 *
 * Responses always carry `source` so the UI can say honestly whether a model looked at the photo.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const FREE_LOOKS_PER_DAY = 3;
const MAX_IMAGE_B64 = 6_000_000; // ~4.5 MB decoded

type LookBody = { kind: 'look'; prompt: string; dogLine: string; allergies: string[]; imageBase64: string };
type SheetBody = { kind: 'sheet'; dogLine: string; text?: string; imageBase64?: string };
type Body = LookBody | SheetBody;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LOOK_SYSTEM =
  'You help a dog owner look at a photo. You are not a veterinarian. Return JSON only: {"title","summary","checks":[string],"next","caution"}. Be specific about what you see. Never invent a diagnosis. Urge a vet for pain, breathing, eye injuries, tight belly, or toxins.';

const SHEET_SYSTEM =
  'Extract medications and feeding times from a veterinary discharge. You are not a veterinarian. Never invent a drug, dose, or time. If it is not written, omit it. JSON only: {"medications":[{"name","dose","times":["HH:MM"],"withFood":true,"days":7,"note":null}],"meals":[{"time":"HH:MM","label":"Breakfast"}]}';

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

  if (body.kind === 'look' && !premium) {
    const day = new Date().toISOString().slice(0, 10);
    const { data: row } = await admin.from('ai_daily_uses').select('count').eq('user_id', uid).eq('day', day).eq('kind', 'look').maybeSingle();
    const used = (row?.count as number | undefined) ?? 0;
    if (used >= FREE_LOOKS_PER_DAY) return json({ ok: false, source: 'local', reason: 'quota', remaining: 0 }, 429);
    await admin.from('ai_daily_uses').upsert({ user_id: uid, day, kind: 'look', count: used + 1 }, { onConflict: 'user_id,day,kind' });
  }

  try {
    if (body.kind === 'look') {
      const result = await askModel(
        LOOK_SYSTEM,
        [
          { type: 'text', text: `${body.prompt} Dog: ${body.dogLine}. Allergies: ${body.allergies?.join(', ') || 'none logged'}.` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } },
        ],
        0.3,
      );
      return json({ ok: true, source: 'ai', result });
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
    console.error('ai failed', body.kind, e);
    return json({ ok: false, source: 'local', reason: 'model_error' }, 502);
  }
});
