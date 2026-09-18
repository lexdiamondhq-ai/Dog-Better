-- Serious-list hardening: hide billing columns, tighten likes + join_circle, atomic Look quota.
-- Apply only as this patch. Do not re-apply the baseline schema.

-- 1. Billing columns stay on profiles for the service role, but signed-in clients cannot read them
-- on other people's rows (or their own via PostgREST). The app already selects public columns only.
revoke all on table public.profiles from public, anon;
revoke select, insert, update, delete on table public.profiles from authenticated;
grant select (id, display_name, avatar_url, created_at) on table public.profiles to authenticated;
grant insert (id, display_name, avatar_url) on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;

-- 2. Likes inherit post visibility (circle + block) instead of a global SELECT.
drop policy if exists "likes readable by members" on public.post_likes;
create policy "likes readable by members" on public.post_likes
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_likes.post_id));

-- 3. SECURITY DEFINER join must refuse a missing session, even if execute is later re-granted.
create or replace function public.join_circle(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
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
revoke execute on function public.join_circle(text) from public, anon;
grant execute on function public.join_circle(text) to authenticated;

-- 4. Atomic Look quota. Returns the new count, or -1 when the cap is already hit.
create or replace function public.consume_ai_use(p_user uuid, p_kind text, p_cap int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare new_count int;
begin
  insert into public.ai_daily_uses (user_id, day, kind, count)
  values (p_user, (timezone('utc', now()))::date, p_kind, 1)
  on conflict (user_id, day, kind)
  do update set count = public.ai_daily_uses.count + 1
  where public.ai_daily_uses.count < p_cap
  returning count into new_count;
  if new_count is null then
    return -1;
  end if;
  return new_count;
end;
$$;

create or replace function public.refund_ai_use(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_daily_uses
     set count = greatest(count - 1, 0)
   where user_id = p_user
     and day = (timezone('utc', now()))::date
     and kind = p_kind;
end;
$$;

revoke execute on function public.consume_ai_use(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.refund_ai_use(uuid, text) from public, anon, authenticated;
