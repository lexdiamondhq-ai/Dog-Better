-- Baseline of public schema, storage buckets, circle RPCs, and the signup trigger
-- as they stood on zdhpwcwxbxmorfnhufhq after the first six remote migrations.
-- Already applied there as 20260914031524. Do not db push this file to that project.
-- A later file, 20260917005645_launch_hardening.sql, adds moderation, Premium mirror, and quotas.

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles are viewable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  breed text,
  sex text default 'unknown' check (sex in ('male', 'female', 'unknown')),
  birthdate date,
  weight_kg numeric,
  avatar_url text,
  microchip text,
  vet_name text,
  vet_phone text,
  allergies text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index dogs_owner_idx on public.dogs (owner_id);
alter table public.dogs enable row level security;
create policy "owners manage dogs" on public.dogs
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric not null,
  recorded_at timestamptz not null default now()
);
create index weight_entries_dog_idx on public.weight_entries (dog_id, recorded_at desc);
alter table public.weight_entries enable row level security;
create policy "owners manage weight entries" on public.weight_entries
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table public.health_logs (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  symptoms text[] not null,
  severity smallint not null check (severity >= 1 and severity <= 5),
  duration text,
  notes text,
  triage text not null check (triage in ('green', 'amber', 'red')),
  guidance text,
  created_at timestamptz not null default now()
);
create index health_logs_dog_idx on public.health_logs (dog_id, created_at desc);
alter table public.health_logs enable row level security;
create policy "owners manage health logs" on public.health_logs
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table public.food_scans (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  barcode text,
  product_name text,
  brand text,
  verdict text not null check (verdict in ('safe', 'caution', 'danger', 'unknown')),
  flagged jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index food_scans_dog_idx on public.food_scans (dog_id, created_at desc);
alter table public.food_scans enable row level security;
create policy "owners manage food scans" on public.food_scans
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('breakfast', 'lunch', 'dinner', 'treat', 'snack')),
  label text,
  calories integer,
  logged_at timestamptz not null default now()
);
create index meals_dog_idx on public.meals (dog_id, logged_at desc);
alter table public.meals enable row level security;
create policy "owners manage meals" on public.meals
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table public.dog_photos (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  kind text not null default 'snap' check (kind in ('snap', 'vet_visit'))
);
create index dog_photos_dog_idx on public.dog_photos (dog_id, created_at desc);
alter table public.dog_photos enable row level security;
create policy "owners manage dog photos" on public.dog_photos
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  osm_id bigint unique,
  name text not null,
  kind text not null check (kind in ('dog_park', 'trail', 'patio', 'beach', 'other')),
  lat double precision not null,
  lng double precision not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index places_geo_idx on public.places (lat, lng);
alter table public.places enable row level security;
create policy "places viewable by signed-in users" on public.places
  for select to authenticated using (true);
create policy "signed-in users add places" on public.places
  for insert to authenticated with check ((select auth.uid()) = created_by);

create table public.place_pulses (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  crowd text not null check (crowd in ('empty', 'light', 'busy', 'packed')),
  ground text not null check (ground in ('dry', 'muddy', 'wet', 'icy')),
  shade boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);
create index place_pulses_place_idx on public.place_pulses (place_id, created_at desc);
alter table public.place_pulses enable row level security;
create policy "pulses viewable by signed-in users" on public.place_pulses
  for select to authenticated using (true);
create policy "users add own pulses" on public.place_pulses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users delete own pulses" on public.place_pulses
  for delete to authenticated using ((select auth.uid()) = user_id);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('nearby', 'contacts', 'custom')),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.circles enable row level security;

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
alter table public.circle_members enable row level security;

create or replace function public.is_circle_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circle_members m
    where m.circle_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.owns_circle(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circles c
    where c.id = cid and c.owner_id = auth.uid()
  );
$$;

create or replace function public.create_circle(p_name text, p_kind text default 'custom')
returns public.circles
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text := btrim(p_name);
  row public.circles;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  invite text := '';
  i int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if char_length(trimmed) < 2 then
    raise exception 'Give it at least two letters.';
  end if;
  if char_length(trimmed) > 40 then
    raise exception 'Keep the name under 40 characters.';
  end if;
  if p_kind not in ('custom', 'nearby', 'contacts') then
    p_kind := 'custom';
  end if;
  for i in 1..6 loop
    invite := invite || substr(alphabet, 1 + floor(random() * char_length(alphabet))::int, 1);
  end loop;
  insert into public.circles (name, kind, owner_id, invite_code)
  values (trimmed, p_kind, auth.uid(), invite)
  returning * into row;
  insert into public.circle_members (circle_id, user_id)
  values (row.id, auth.uid())
  on conflict do nothing;
  return row;
end;
$$;

create or replace function public.join_circle(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare cid uuid;
begin
  select id into cid from public.circles where invite_code = upper(trim(code));
  if cid is null then
    raise exception 'Circle not found';
  end if;
  insert into public.circle_members (circle_id, user_id)
  values (cid, auth.uid())
  on conflict do nothing;
  return cid;
end;
$$;

create policy "members read circles" on public.circles
  for select to authenticated using (owner_id = auth.uid() or public.is_circle_member(id));
create policy "owners insert circles" on public.circles
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owners update circles" on public.circles
  for update to authenticated using (owner_id = auth.uid());
create policy "owners delete circles" on public.circles
  for delete to authenticated using (owner_id = auth.uid());

create policy "members read membership" on public.circle_members
  for select to authenticated using (user_id = auth.uid() or public.owns_circle(circle_id));
create policy "self insert membership" on public.circle_members
  for insert to authenticated with check (user_id = auth.uid());
create policy "self delete membership" on public.circle_members
  for delete to authenticated using (user_id = auth.uid() or public.owns_circle(circle_id));

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  caption text,
  image_path text,
  created_at timestamptz not null default now(),
  circle_id uuid references public.circles (id) on delete set null
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_circle_id_idx on public.posts (circle_id);
alter table public.posts enable row level security;
create policy "posts readable by members" on public.posts
  for select to authenticated
  using (
    circle_id is null
    or author_id = (select auth.uid())
    or public.is_circle_member(circle_id)
    or public.owns_circle(circle_id)
  );
create policy "authors insert own posts" on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "authors delete own posts" on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes readable by members" on public.post_likes
  for select to authenticated using (true);
create policy "users like as themselves" on public.post_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users unlike as themselves" on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 280),
  created_at timestamptz not null default now()
);
create index post_comments_post_id_idx on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;
create policy "comments readable by members" on public.post_comments
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_comments.post_id));
create policy "authors insert own comments" on public.post_comments
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "authors delete own comments" on public.post_comments
  for delete to authenticated using (author_id = (select auth.uid()));

create table public.walks (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  steps integer not null check (steps >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index walks_dog_started_idx on public.walks (dog_id, started_at desc);
alter table public.walks enable row level security;
create policy "owners manage own walks" on public.walks
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values
  ('media', 'media', true),
  ('vault', 'vault', false)
on conflict (id) do nothing;

create policy "media is publicly readable" on storage.objects
  for select to public using (bucket_id = 'media');
create policy "users upload media into own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users read own vault" on storage.objects
  for select to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users upload own vault" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own vault" on storage.objects
  for update to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own vault" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
