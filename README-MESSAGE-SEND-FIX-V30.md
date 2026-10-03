# SYNAX V30 — Message Send Reliability Fix

V30 fixes the V29 failure mode where the realtime Durable Object request could fail,
but `broadcastChatMessage()` swallowed that failure and `/api/messages` still returned
a success response without actually persisting the message.

## Changes
- Realtime broadcast errors are now propagated to the `/api/messages` route.
- A failed realtime enqueue falls back to direct Supabase persistence.
- After durable persistence, realtime fan-out is best-effort and cannot turn a successful
  database send into an HTTP 503.
- `clientMessageId` is preserved in the response for optimistic reconciliation.
- Existing WebSocket typing indicator is unchanged.

## Result
- Normal case: Durable Object queues + broadcasts immediately; Supabase persists asynchronously.
- Realtime failure: message is still saved in Supabase and remains after refresh.
- No false HTTP success from a failed realtime enqueue.
