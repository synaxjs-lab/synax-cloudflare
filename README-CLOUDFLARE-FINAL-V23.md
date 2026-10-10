# SYNAX Cloudflare Final V23

## V23 fixes

- Persistent last-seen now falls back to `synax_user_usage` when a Durable Object has no local cached timestamp.
- Last-seen is persisted back to `synax_user_usage` when a visible SYNAX session actually leaves the active state.
- The chat scroll viewport no longer uses CSS containment that can interfere with scrolling on some browsers/devices.
- Desktop wheel scrolling and mobile touch/pan scrolling are explicitly enabled on the message viewport.
- The identity-selection and chat viewport remain otherwise unchanged.
- No new Supabase table is required.

## Supabase

If this is a new Supabase project, run the existing `supabase-schema.sql` first. The specific presence table required by V23 is:

```sql
create table if not exists public.synax_user_usage (
  user_id text primary key check (user_id in ('person_1', 'person_2')),
  continuous_used_seconds bigint not null default 0,
  daily_used_seconds bigint not null default 0,
  daily_usage_date text,
  active boolean not null default false,
  active_started_at bigint,
  last_heartbeat bigint not null default 0,
  last_seen bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.synax_user_usage
  add column if not exists last_seen bigint not null default 0;

alter table public.synax_user_usage
  add column if not exists last_heartbeat bigint not null default 0;

alter table public.synax_user_usage
  add column if not exists active boolean not null default false;

alter table public.synax_user_usage
  add column if not exists active_started_at bigint;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.synax_user_usage to service_role;

insert into public.synax_user_usage (user_id)
values ('person_1'), ('person_2')
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
```

Do not put `SUPABASE_SECRET_KEY` in a Vite/client environment variable. Update the Cloudflare Worker secret/variable values to the new Supabase project URL and secret key.
