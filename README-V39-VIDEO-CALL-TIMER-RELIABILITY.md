# SYNAX V39 — Video, Call and Timer Reliability

## What changed

- Video uploads are initialized as TUS sessions server-side and all chunks are sent through same-origin Cloudflare Worker proxy endpoints. This avoids browser-specific CORS failures on mobile Chrome and other mobile browsers.
- Uploads use 4 MB chunks, visible byte-based progress, retries, resume-from-offset handling and a final 100% only after the final storage acknowledgement.
- The composer clearly shows the video filename, live percentage and progress bar while a video is being sent. No success-toast line is added.
- The timer now uses a monotonically increasing Supabase `usage_version`. Stale Cloudflare isolates/responses cannot restore previously consumed minutes during the same day.
- The daily allowance is reset only by the scheduled Cloudflare cron at 12:00 AM IST. Normal login, refresh, reconnect, heartbeat and API requests do not reset the allowance.
- WebRTC now requests short-lived Cloudflare TURN credentials from the server when configured, while retaining STUN fallback. Calls require a secure browser context and no longer silently turn a failed video call into an audio-only call.

## Supabase

Run `SUPABASE-V39-TIMER-CALLS-VIDEO.sql` once.

## Cloudflare TURN

Create a Cloudflare Realtime TURN key and store its key id and long-lived API token as Worker secrets named `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`. The API token must stay server-side.

Without TURN credentials, direct/STUN WebRTC still works, but some restrictive mobile/carrier networks may not establish a peer connection.
