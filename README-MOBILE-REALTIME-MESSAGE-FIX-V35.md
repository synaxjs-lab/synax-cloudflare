# SYNAX V35 — Mobile Realtime Message Latency Fix

## Primary fix
- Mobile sends now use the authenticated Cloudflare Durable Object WebSocket as the primary transport instead of waiting for the HTTP message endpoint.
- A small readiness window lets a freshly opened mobile chat finish WebSocket authentication before falling back; it is capped at 450 ms.
- Socket message acknowledgement timeout is 1 second; if it is not acknowledged, the existing idempotent HTTP API is used with the same `clientMessageId`.
- The optimistic message bubble still renders immediately and is reconciled by `clientMessageId`.

## Cloudflare Durable Object improvements
- WebSocket authentication now returns `auth:success` immediately after session validation rather than waiting on Supabase last-seen queries or bulk delivery reconciliation.
- Presence requests now return a cheap in-memory snapshot immediately and refresh persistent presence in the background.
- Per-message websocket processing no longer waits for the presence-alarm storage operation.
- Presence heartbeat/active broadcasts run as background tasks.
- Presence last-seen queries run in parallel when a full authoritative snapshot is required.
- Queue and dedup writes for a message are performed concurrently.
- Temporary `pending_...` message ids are replaced with canonical server ids.

## Mobile reliability
- Foreground/pageshow/online/focus events force an immediate realtime reconnect instead of waiting for a long backoff.
- Visible-tab reconnect backoff is capped at 3 seconds.

## Motion/audio
- Message/reaction animations stay transform/opacity-only and are not part of the network critical path.
- Send/receive sound initialization is deferred one task so Web Audio startup cannot delay the visible message UI on slower phones.

## Existing features preserved
- V31 midnight daily reset and admin controls
- V33 Durable Object routing
- V34 lightweight animations and desktop reactions
- typing indicator
- shared chat backgrounds
- replies, calls, reactions, authentication, persistence, and existing responsive UI
