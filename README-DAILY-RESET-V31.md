# SYNAX V31 — Daily Reset + Typing UX

- Adds an admin-controlled daily allowance reset at 12:00 AM Asia/Kolkata.
- Cloudflare Cron runs at 18:30 UTC (`30 18 * * *`) and executes the Worker `scheduled()` handler.
- The reset is persisted in `synax_user_usage` and broadcasts fresh time status to connected users.
- The configured `allowedMinutes` value is the daily allowance; it is not changed by the reset. Example: 180 minutes is available again after midnight.
- Adds an explicit Daily Reset switch to the Admin Time Controls page.
- Improves the existing realtime typing state with animated dots and a lightweight bottom typing bubble.
- Adds a small message-enter animation; existing message transport, persistence, replies, reactions, calls, backgrounds, and authentication are otherwise left intact.

Cron schedules are UTC on Cloudflare Workers; `18:30 UTC` corresponds to `00:00` in India Standard Time.
