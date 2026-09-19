import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * The only place Dog Better talks to a model. The OpenAI key lives here as a secret, never in the
 * app bundle. Free users get FREE_LOOKS_PER_DAY Look calls; Premium (profiles.premium_until, written by
 * the RevenueCat webhook) gets PREMIUM_LOOKS_PER_DAY. Visit-sheet reads are free.
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
const MAX_FILE_B64 = 4_000_000;

type LookBody = { kind: 'look'; prompt: string; dogLine: string; allergies: string[]; imageBase64: string };
type SheetBody = {
  kind: 'sheet';
  dogLine: string;
  text?: string;
  imageBase64?: string;
  fileBase64?: string;
  fileMime?: string;
  fileName?: string;
};
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
  'Extract medications, feeding times, and follow-up / vaccine dates from a veterinary discharge, vaccine card, or prescription label. You are not a veterinarian. Never invent a drug name or a date. ' +
  'quantity is how much to give (1 tablet, 1/2 tablet, 2 ml). dose is the printed strength (75 mg, 100 mg/ml). ' +
  'times is clock times only when a clock is written. frequency is the written rhythm (twice daily, BID, every 12 hours) even when no clock appears. ' +
  'days is the course length only when written. followUps covers recheck, return, suture removal, and vaccine / booster due dates. ' +
  'followUps.date is YYYY-MM-DD when a calendar date is written, or a relative phrase such as "in 2 weeks" when that is all that is written. ' +
  'followUps.kind is vaccine for shots / rabies / DHPP / Bordetella / boosters, otherwise vet. If a field is not written, use null or []. Do not invent a drug or a date. ' +
  'Put every written drug, preventative, and prescription into medications, even if no clock time is printed. ' +
  'JSON only: {"medications":[{"name","quantity":null,"dose":null,"times":[],"frequency":null,"withFood":false,"days":null,"note":null}],"meals":[{"time":"HH:MM","label":"Breakfast","days":null}],"followUps":[{"title","date":null,"time":null,"kind":"vet","note":null}]}';

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

function isPdf(body: SheetBody) {
  return body.fileMime === 'application/pdf' || /\.pdf$/i.test(body.fileName ?? '');
}

function sheetHasDrugs(raw: Record<string, unknown> | null) {
  if (!raw) return false;
  for (const key of ['medications', 'meds', 'prescriptions', 'drugs', 'rx']) {
    const v = raw[key];
    if (Array.isArray(v) && v.length > 0) return true;
  }
  return false;
}

function decodeB64(b64: string) {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function scrapePdfLatin1(bytes: Uint8Array) {
  let latin1 = '';
  for (let i = 0; i < bytes.length; i++) latin1 += String.fromCharCode(bytes[i]);
  const out: string[] = [];
  const re = /\(((?:\\[nrtf()\\]|\\[0-7]{1,3}|[^\\)]){2,})\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(latin1))) {
    const s = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\t/g, ' ')
      .replace(/\\([()\\])/g, '$1');
    if (/[A-Za-z]{3,}/.test(s)) out.push(s.trim());
  }
  const joined = out.join('\n').replace(/[ \t]{2,}/g, ' ').trim();
  return joined.length > 20 ? joined.slice(0, 40_000) : '';
}

async function pdfToText(b64: string) {
  const bytes = decodeB64(b64);
  const scraped = scrapePdfLatin1(bytes);
  try {
    const { extractText, getDocumentProxy } = await import('npm:unpdf@1.1.0');
    const pdf = await getDocumentProxy(bytes);
    const out = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(out.text) ? out.text.join('\n') : String(out.text ?? '');
    if (text.trim().length > scraped.length) return text;
  } catch (e) {
    console.error('pdf extract', e);
  }
  return scraped;
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
  const file = 'fileBase64' in body ? body.fileBase64 : undefined;
  if (image && image.length > MAX_IMAGE_B64) return json({ error: 'image_too_large' }, 413);
  if (file && file.length > MAX_FILE_B64) return json({ error: 'image_too_large' }, 413);

  if (!OPENAI_KEY) return json({ ok: false, source: 'local', reason: 'not_configured' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: profile } = await admin.from('profiles').select('premium_until').eq('id', uid).maybeSingle();
  const premium = !!profile?.premium_until && new Date(profile.premium_until as string).getTime() > Date.now();

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

    const ask = `Read this clinic discharge, prescription, or vaccine card for ${body.dogLine}. Extract every medication that is written: name, give quantity, strength, frequency, clock times, and days. Also extract every follow-up, recheck, and vaccine due date.`;
    const pdfText = body.fileBase64 && isPdf(body) ? await pdfToText(body.fileBase64) : '';
    const text = [body.text, pdfText].filter(Boolean).join('\n\n');
    let last: Record<string, unknown> | null = null;

    if (text.trim()) {
      try {
        last = await askModel(SHEET_SYSTEM, [{ type: 'text', text: `${ask}\n\nDischarge text:\n${text.slice(0, 12000)}` }], 0);
        if (sheetHasDrugs(last) || !body.imageBase64) return json({ ok: true, source: 'ai', result: last });
      } catch (e) {
        console.error('sheet text failed', e);
      }
    }

    if (body.imageBase64) {
      const result = await askModel(
        SHEET_SYSTEM,
        [
          { type: 'text', text: ask },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } },
        ],
        0,
      );
      return json({ ok: true, source: 'ai', result });
    }

    if (last) return json({ ok: true, source: 'ai', result: last });
    if (!body.fileBase64 && !text.trim()) return json({ error: 'bad_request' }, 400);
    return json({ ok: false, source: 'local', reason: 'model_error' }, 502);
  } catch (e) {
    if (chargedLook) {
      await admin.rpc('refund_ai_use', { p_user: uid, p_kind: 'look' });
    }
    console.error('ai failed', body.kind, e);
    return json({ ok: false, source: 'local', reason: 'model_error' }, 502);
  }
});
