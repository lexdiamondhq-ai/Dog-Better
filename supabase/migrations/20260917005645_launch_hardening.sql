-- Launch hardening: moderation, circle privacy, premium mirror, AI quota, analytics, storage limits.
-- Applied to project zdhpwcwxbxmorfnhufhq as 20260917005645. Do not re-apply there.

-- 1. Posts carry an explicit kind so feeds split photo / video server-side instead of by file extension.
alter table public.posts add column if not exists kind text not null default 'photo';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'posts_kind_check') then
    alter table public.posts add constraint posts_kind_check check (kind in ('photo', 'video'));
  end if;
end $$;
update public.posts set kind = 'video' where image_path ~* '\.(mp4|mov|m4v|webm)$' and kind <> 'video';
create index if not exists posts_kind_created_idx on public.posts (kind, created_at desc);

-- 2. Blocking. A block hides content in both directions everywhere RLS is consulted.
create table if not exists public.blocked_users (
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);
alter table public.blocked_users enable row level security;
drop policy if exists "users manage own blocks" on public.blocked_users;
create policy "users manage own blocks" on public.blocked_users
  for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

-- Definer so the check can see blocks in both directions without exposing the table.
create or replace function public.is_blocked_either_way(other uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;
revoke execute on function public.is_blocked_either_way(uuid) from public, anon;
grant execute on function public.is_blocked_either_way(uuid) to authenticated;

-- 3. Reports. Users can file them; only the service role reads them.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  target_kind text not null check (target_kind in ('post', 'comment', 'user', 'place')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'animal_welfare', 'explicit', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "users file reports" on public.reports;
create policy "users file reports" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

-- 4. Post visibility: circle posts stay inside the circle, and blocked authors disappear.
drop policy if exists "posts readable by members" on public.posts;
create policy "posts readable by members" on public.posts
  for select to authenticated
  using (
    (
      circle_id is null
      or author_id = (select auth.uid())
      or public.is_circle_member(circle_id)
      or public.owns_circle(circle_id)
    )
    and not public.is_blocked_either_way(author_id)
  );

drop policy if exists "comments readable by members" on public.post_comments;
create policy "comments readable by members" on public.post_comments
  for select to authenticated
  using (
    not public.is_blocked_either_way(author_id)
    and exists (select 1 from public.posts p where p.id = post_comments.post_id)
  );

-- 5. Circle RPCs were callable anonymously (security advisor). Signed-in only.
revoke execute on function public.create_circle(text, text) from anon;
revoke execute on function public.join_circle(text) from anon;
revoke execute on function public.is_circle_member(uuid) from anon;
revoke execute on function public.owns_circle(uuid) from anon;

-- 6. Premium mirror written by the RevenueCat webhook. The AI proxy trusts this, never the client.
alter table public.profiles add column if not exists premium_until timestamptz;
alter table public.profiles add column if not exists rc_app_user_id text;

-- 7. Server-side AI quota. No client policies: the ai Edge Function owns this table.
create table if not exists public.ai_daily_uses (
  user_id uuid not null,
  day date not null,
  kind text not null,
  count int not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_daily_uses enable row level security;

-- 8. Funnel analytics with zero third-party SDKs. Insert-only for clients.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  platform text,
  app_version text,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
drop policy if exists "users log own events" on public.analytics_events;
create policy "users log own events" on public.analytics_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create index if not exists analytics_events_name_created_idx on public.analytics_events (name, created_at desc);

-- 9. Storage caps. Uploads already send an explicit content type.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/*', 'video/*']
 where id = 'media';
update storage.buckets
   set file_size_limit = 26214400,
       allowed_mime_types = array[
         'image/*',
         'application/pdf',
         'text/plain',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 where id = 'vault';
