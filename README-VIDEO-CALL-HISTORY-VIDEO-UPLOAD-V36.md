# SYNAX V36 — Video Upload + Call History

This build is based directly on V35. Existing authentication, messages, replies, reactions, calls, backgrounds, daily reset, typing, and realtime behavior are preserved.

## Video sharing
- Attachment picker now accepts photos and videos.
- Video uploads use XMLHttpRequest only when progress reporting is requested, exposing actual upload percentage without putting animation work on the message transport path.
- Video chat messages are stored with `type = video`.
- Successful video messages include `Video sent successfully ✓` in the message content.
- Existing files, photos, and voice messages continue using their existing path.

## Call history
- Call start, connect/answer, decline, and end events create deduplicated `system` chat records keyed by call ID and event.
- Records are persisted in `synax_messages` and broadcast to both participants when realtime is available; persisted history makes them visible after reload as well.

## Supabase migration
- `synax_messages.type` now allows `video`.
- The included migration drops/recreates the type check constraint for existing databases and refreshes PostgREST's schema cache.
