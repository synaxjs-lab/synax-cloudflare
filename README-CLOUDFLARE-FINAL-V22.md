# SYNAX Cloudflare Final V22

## Purpose
V22 fixes realtime presence/last-seen state without changing the existing UI, messaging, calls, timer, shared background, reply, or Cloudflare architecture.

## Presence rules
- Visible SYNAX tab: ONLINE.
- SYNAX hidden/background: OFFLINE / Last seen, while the live socket may still receive messages.
- No live authenticated socket: offline/not connected; new messages remain one tick until the recipient reconnects.
- Last seen is recorded when a visible SYNAX state ends, not repeatedly refreshed by background heartbeats or replaced by browser close time after the tab was already hidden.

## Client fixes
- Removed `Date.now()` fallback for the initial Last seen display.
- Missing timestamps no longer become a fake current time.
- Presence updates preserve the last authoritative timestamp when a payload does not include one.

## Durable Object fixes
- `Last seen` is only advanced on a true visible -> hidden/closed transition.
- Repeated inactive heartbeats do not keep moving Last seen forward.
- Closing an already-hidden socket does not replace the real Last seen with the close time.

## Important architecture rule
Realtime presence remains authoritative in the Durable Object. The persistent Supabase timer/usage table is not broadcast as a competing realtime presence snapshot.

## Supabase
No new Supabase table or SQL query is required for this V22 presence fix. Existing `synax_user_usage` remains compatible with the application.

## Validation
The modified project was compared against V21. Only these application files were changed:
- `src/components/ChatRoom.tsx`
- `worker/realtime.ts`
- `server.cloudflare.ts`

A full dependency-backed TypeScript build could not be executed in the packaging environment because project dependencies were not installed; the TypeScript compiler still parsed the source files and reported only existing dependency/type-resolution issues, not syntax errors from this change.
