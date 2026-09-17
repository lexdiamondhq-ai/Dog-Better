import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Deletes the calling user and everything they own. Apple guideline 5.1.1(v) requires this to be
 * initiated and completed in-app. Order matters: storage objects first (they do not cascade), then
 * rows that lack an FK to auth.users, then the auth user itself.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function removePrefix(admin: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  // list() is non-recursive, so walk the tree.
  const stack = [prefix];
  const paths: string[] = [];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    for (const entry of data ?? []) {
      const full = `${dir}/${entry.name}`;
      if (entry.id === null) stack.push(full);
      else paths.push(full);
    }
  }
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
  return paths.length;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const [media, vault] = await Promise.all([removePrefix(admin, 'media', uid), removePrefix(admin, 'vault', uid)]);

    // Dogs cascade to photos, scans, logs, meals, walks, weights. Posts cascade to likes and comments.
    await admin.from('dogs').delete().eq('owner_id', uid);
    await admin.from('posts').delete().eq('author_id', uid);
    await admin.from('post_comments').delete().eq('author_id', uid);
    await admin.from('post_likes').delete().eq('user_id', uid);
    await admin.from('place_pulses').delete().eq('user_id', uid);
    await admin.from('circles').delete().eq('owner_id', uid);
    await admin.from('circle_members').delete().eq('user_id', uid);
    await admin.from('blocked_users').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);
    await admin.from('reports').delete().eq('reporter_id', uid);
    await admin.from('ai_daily_uses').delete().eq('user_id', uid);
    await admin.from('analytics_events').delete().eq('user_id', uid);
    await admin.from('profiles').delete().eq('id', uid);

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;

    return json({ ok: true, removed: { media, vault } });
  } catch (e) {
    console.error('delete-account failed', uid, e);
    return json({ error: 'delete_failed' }, 500);
  }
});
