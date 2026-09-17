import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * RevenueCat -> profiles.premium_until. The app user id RevenueCat sees is the Supabase auth uid
 * (set by Purchases.logIn in src/lib/entitlements.tsx), so the mapping is direct.
 *
 * Configure in RevenueCat: Integrations > Webhooks, URL = this function, Authorization header =
 * "Bearer <REVENUECAT_WEBHOOK_SECRET>". verify_jwt is off because RevenueCat does not send a Supabase JWT.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

type RcEvent = {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!SECRET || req.headers.get('Authorization') !== `Bearer ${SECRET}`) return json({ error: 'unauthorized' }, 401);

  let event: RcEvent;
  try {
    event = ((await req.json()) as { event: RcEvent }).event;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const candidates = [event.app_user_id, event.original_app_user_id].filter((v): v is string => !!v && UUID.test(v));
  if (!candidates.length) return json({ ok: true, skipped: 'no_supabase_uid' });
  const uid = candidates[0];

  const ending = ['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED'];
  const active = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'TRANSFER', 'TEMPORARY_ENTITLEMENT_GRANT'];

  let premiumUntil: string | null | undefined;
  if (active.includes(event.type)) {
    premiumUntil = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  } else if (event.type === 'EXPIRATION') {
    premiumUntil = new Date().toISOString();
  } else if (ending.includes(event.type)) {
    // Cancellation keeps access until the period ends; RevenueCat still sends expiration_at_ms.
    premiumUntil = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : undefined;
  }
  if (premiumUntil === undefined) return json({ ok: true, skipped: event.type });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await admin.from('profiles').update({ premium_until: premiumUntil, rc_app_user_id: event.app_user_id }).eq('id', uid);
  if (error) {
    console.error('revenuecat-webhook update failed', uid, error);
    return json({ error: 'update_failed' }, 500);
  }
  return json({ ok: true, uid, premium_until: premiumUntil });
});
