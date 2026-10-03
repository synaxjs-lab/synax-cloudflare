# SYNAX Cloudflare Final V25

V25 is a focused realtime/presence reliability release based on V24.

## Main fixes
- Presence is self-healing without page refreshes.
- Online is driven by visible SYNAX tab state, with a WebSocket fast path and a lightweight authenticated API reconciliation fallback.
- WebSocket presence heartbeats run every 4 seconds; stale connections expire after 12 seconds.
- Last seen records the last known moment the SYNAX tab was actually visible (`lastActiveAt`) instead of the later cleanup/timeout time.
- Presence timestamps accept milliseconds, seconds, numeric strings, and ISO timestamps when reading existing Supabase data.
- The realtime client immediately emits the `auth:success.presence` snapshot to `presence:update` listeners, removing the initial mount race.
- The existing message receipt reconciliation remains in place.
- No new Supabase table is required.

## Supabase
The existing `synax_user_usage` table is used. Expected columns:
- user_id
- active
- active_started_at
- last_heartbeat
- last_seen
- continuous_used_seconds
- daily_used_seconds
- daily_usage_date
- updated_at

If this is a fresh database, run `supabase-schema.sql` once.

## Cloudflare secrets
- SUPABASE_URL
- SUPABASE_SECRET_KEY

Do not expose SUPABASE_SECRET_KEY through Vite/client variables.
