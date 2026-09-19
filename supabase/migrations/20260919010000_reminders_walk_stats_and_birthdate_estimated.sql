-- Calendar reminders leave the phone. Dose custody records who claimed a row.
-- Walks keep metres and stop counts so limp watch has a baseline.
-- Onboarding can store whether a birthday was estimated.

alter table public.dogs
  add column if not exists birthdate_estimated boolean;

alter table public.walks
  add column if not exists metres numeric,
  add column if not exists stop_count integer;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'treat', 'medication', 'meal', 'walk', 'groom', 'vet', 'vaccine',
    'training', 'boarding', 'birthday', 'other'
  )),
  title text not null,
  time text not null,
  date date not null,
  notes text,
  color text,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  completed_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_dog_date_idx on public.reminders (dog_id, date, time);
create index if not exists reminders_owner_idx on public.reminders (owner_id);

alter table public.reminders enable row level security;

drop policy if exists "owners manage reminders" on public.reminders;
create policy "owners manage reminders"
  on public.reminders
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reminders'
  ) then
    alter publication supabase_realtime add table public.reminders;
  end if;
end $$;
