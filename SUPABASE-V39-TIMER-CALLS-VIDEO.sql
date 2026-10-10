-- SYNAX V39 authoritative timer + video/call support.
-- Run once in the existing Supabase project.

-- 1) Stable monotonic usage revision. This prevents stale Worker isolates
-- from resurrecting a user's remaining daily minutes.
alter table public.synax_user_usage
  add column if not exists usage_version bigint not null default 0;

-- 2) Ensure video messages are accepted.
alter table public.synax_messages
  drop constraint if exists synax_messages_type_check;

alter table public.synax_messages
  add constraint synax_messages_type_check
  check (type in ('text', 'image', 'video', 'file', 'voice', 'system'));

-- 3) Atomic active-use checkpoint. This never changes the daily counter to zero.
create or replace function public.synax_checkpoint_usage(
  p_user_id text,
  p_now_ms bigint,
  p_active boolean,
  p_today text,
  p_grace_ms bigint default 15000
)
returns public.synax_user_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.synax_user_usage%rowtype;
  effective_end bigint;
  elapsed_seconds bigint := 0;
  grace_ms bigint := greatest(1000, least(coalesce(p_grace_ms, 15000), 60000));
begin
  if p_user_id not in ('person_1', 'person_2') then
    raise exception 'Invalid SYNAX user id';
  end if;

  insert into public.synax_user_usage (
    user_id, continuous_used_seconds, daily_used_seconds, daily_usage_date,
    active, active_started_at, last_heartbeat, last_seen, updated_at, usage_version
  ) values (
    p_user_id, 0, 0, p_today, false, null, 0, 0, now(), 0
  )
  on conflict (user_id) do nothing;

  select * into usage_row
  from public.synax_user_usage
  where user_id = p_user_id
  for update;

  if usage_row.active and usage_row.active_started_at is not null then
    effective_end := least(
      p_now_ms,
      greatest(coalesce(usage_row.last_heartbeat, usage_row.active_started_at), usage_row.active_started_at) + grace_ms
    );
    elapsed_seconds := greatest(
      0,
      floor((effective_end - usage_row.active_started_at) / 1000.0)
    );
    usage_row.daily_used_seconds := greatest(
      0,
      coalesce(usage_row.daily_used_seconds, 0) + elapsed_seconds
    );
  end if;

  if p_active then
    usage_row.active := true;
    usage_row.active_started_at := p_now_ms;
    usage_row.last_heartbeat := p_now_ms;
  else
    usage_row.active := false;
    usage_row.active_started_at := null;
    usage_row.last_heartbeat := p_now_ms;
    usage_row.last_seen := p_now_ms;
  end if;

  usage_row.usage_version := coalesce(usage_row.usage_version, 0) + 1;
  usage_row.updated_at := now();

  update public.synax_user_usage
  set
    continuous_used_seconds = usage_row.continuous_used_seconds,
    daily_used_seconds = usage_row.daily_used_seconds,
    daily_usage_date = usage_row.daily_usage_date,
    active = usage_row.active,
    active_started_at = usage_row.active_started_at,
    last_heartbeat = usage_row.last_heartbeat,
    last_seen = usage_row.last_seen,
    updated_at = usage_row.updated_at,
    usage_version = usage_row.usage_version
  where user_id = p_user_id;

  return usage_row;
end;
$$;

grant execute on function public.synax_checkpoint_usage(text, bigint, boolean, text, bigint) to service_role;

-- 4) The only automatic daily reset. The Cloudflare cron invokes this at
-- 30 18 * * * UTC = 12:00 AM Asia/Kolkata.
create or replace function public.synax_reset_daily_usage(
  p_reset_date text,
  p_reset_at_ms bigint
)
returns setof public.synax_user_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.synax_user_usage%rowtype;
  current_heartbeat bigint;
begin
  for r in
    select * from public.synax_user_usage
    where user_id in ('person_1', 'person_2')
    order by user_id
    for update
  loop
    -- Idempotent scheduled execution: a duplicate trigger for the same
    -- India-local date does not reset the counter a second time.
    if r.daily_usage_date = p_reset_date then
      continue;
    end if;

    current_heartbeat := coalesce(r.last_heartbeat, 0);
    r.daily_used_seconds := 0;
    r.daily_usage_date := p_reset_date;
    r.usage_version := coalesce(r.usage_version, 0) + 1;

    if r.active
       and current_heartbeat > 0
       and current_heartbeat >= p_reset_at_ms - 15000
       and current_heartbeat <= p_reset_at_ms + 15000 then
      r.active := true;
      r.active_started_at := p_reset_at_ms;
    else
      r.active := false;
      r.active_started_at := null;
      if current_heartbeat > 0 then r.last_seen := current_heartbeat; end if;
    end if;

    r.updated_at := now();

    update public.synax_user_usage
    set
      continuous_used_seconds = r.continuous_used_seconds,
      daily_used_seconds = r.daily_used_seconds,
      daily_usage_date = r.daily_usage_date,
      active = r.active,
      active_started_at = r.active_started_at,
      last_heartbeat = r.last_heartbeat,
      last_seen = r.last_seen,
      updated_at = r.updated_at,
      usage_version = r.usage_version
    where user_id = r.user_id;

    return next r;
  end loop;
end;
$$;

grant execute on function public.synax_reset_daily_usage(text, bigint) to service_role;

notify pgrst, 'reload schema';
