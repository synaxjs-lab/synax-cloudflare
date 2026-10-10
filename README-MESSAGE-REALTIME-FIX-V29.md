# SYNAX V29 — Realtime Messaging + Typing Fix

This build changes the chat send path so a validated message is handed to the Cloudflare Durable Object before the Supabase write completes.

## Message delivery
- Server authentication, time restrictions, and feature checks still run in `/api/messages`.
- The validated message is queued in Durable Object storage and broadcast to connected users immediately.
- Supabase persistence runs in the background and retries from the Durable Object alarm.
- Pending messages are exposed back to `/api/messages`, so an immediate browser refresh cannot erase a message that was already accepted.
- `clientMessageId` remains the stable idempotency key for retries and optimistic reconciliation.
- Delivery status is based on a live authenticated WebSocket; read status remains viewport-based.
- Pending messages can advance to delivered/read before Supabase persistence finishes.

## Typing indicator
- Typing sends a lightweight WebSocket event only at the start of a typing burst and after idle/blur/send.
- Both users receive the existing `typing…` header indicator and the animated typing bubble.
- Disconnects explicitly clear the partner's typing state.

## Performance
- Connected clients no longer use a full message polling loop.
- Receipt reconciliation was reduced to every 10 seconds as a recovery path.
- Presence snapshot polling is only a fallback while realtime is disconnected.

## Deploy

```powershell
npm install
npm run build
npx wrangler deploy
```

Then test with two browsers/devices logged in as `person_1` and `person_2`.
