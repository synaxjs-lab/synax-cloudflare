# SYNAX Cloudflare Final V24

Focused reliability rebuild for realtime presence, last-seen accuracy, and chat scrolling.

- WebSocket auth carries the browser's current SYNAX-tab visibility, removing the first-connect presence race.
- Authenticated WebSocket heartbeat starts only after realtime authentication succeeds.
- Presence is re-announced immediately after authentication/reconnect.
- Persistent `last_seen` changes only on an active -> inactive transition. Repeated cleanup calls cannot move Last seen forward.
- Login/auth responses hydrate the other user's persisted `lastActiveTimestamp` from `synax_user_usage`.
- The chat message area is an explicit viewport-level scrolling element for mouse-wheel and mobile touch scrolling.

No new Supabase table is required. The existing `synax_user_usage` table must contain `active`, `active_started_at`, `last_heartbeat`, and `last_seen`.
