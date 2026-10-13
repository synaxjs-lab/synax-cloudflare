# SYNAX V42 — Message History Persistence/Refresh Fix

## What changed

- `server.cloudflare.ts`: message-history requests no longer short-circuit to a potentially stale per-isolate `db.messages` snapshot just because an earlier request cached `synax_messages` as unavailable. Each history request probes Supabase again.
- History retrieval now reads in stable 1,000-row pages (up to 5,000 messages), because PostgREST/Supabase can enforce a lower maximum row count than the previous single `limit=5000` request. Pages are ordered by `timestamp` and `id` and combined in chronological order.
- Transient Supabase/API errors are logged and returned as a service error rather than silently substituting stale in-memory history.

## Deploy

1. Replace the existing project source with this ZIP, preserving your Cloudflare Worker secrets.
2. Run `npm install` in the project directory if dependencies are not installed.
3. Run `npm run build:cloudflare`.
4. Deploy with `npm run deploy` (or your normal Cloudflare Pages/Workers deployment workflow).
5. Confirm the deployed Worker is `synax-cloudflare1` and that `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are configured as Worker secrets.
6. Open the chat, refresh, and verify the existing messages return.

## Important

This change does not delete, rewrite, or recreate the `synax_messages` table. No additional SQL migration is required for this code fix. The local build could not be executed in the packaging environment because dependencies (`vite`) are not installed; run the build before deploying. If the deployed chat still shows no history, inspect the Worker logs for `SYNAX canonical message history fetch failed` and test the authenticated `GET /api/messages` request in the browser Network panel. The response should contain the rows visible in Supabase.
