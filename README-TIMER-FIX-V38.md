# SYNAX V38 — Authoritative Daily Timer Fix

This version removes the intermittent countdown reset/jump and makes the daily timer authoritative.

## Rules
- Each person has one configured daily allowance (`allowedMinutes`).
- Only active SYNAX chat time is consumed.
- Refresh, reconnect, login, heartbeat and browser lifecycle events never reset consumed time.
- The only automatic reset is the Cloudflare cron at `30 18 * * *` UTC, which is 12:00 AM Asia/Kolkata.
- The Supabase checkpoint function serializes concurrent usage updates so Worker isolates cannot replace an existing usage value with a fresh timer.
- The midnight reset function locks the usage rows, so a heartbeat cannot race the reset and restore yesterday's counter after midnight.
- The browser ignores stale timer responses that would resurrect already-consumed minutes.

## Supabase
Run `SUPABASE-V38-TIMER-FIX.sql` once in the existing Supabase project.
