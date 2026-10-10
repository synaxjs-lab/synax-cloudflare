# SYNAX V41 — Resumable Upload Authentication Fix

This version fixes the upload-session failure shown as `Supabase TUS session creation failed` / `Invalid Compact JWS`.

## What changed

- Removed the signed-upload-token (`x-signature`) handshake that Storage was rejecting.
- The Cloudflare Worker now creates, checks, and patches TUS sessions using its server-side Supabase Storage credentials.
- New `sb_secret_*` keys are sent only in the `apikey` header. Legacy service-role JWTs use `apikey` plus `Authorization: Bearer ...`.
- Storage credentials stay on the Worker and are never returned to the browser.
- TUS upload locations are normalized to absolute URLs, including when Storage returns a relative `Location` header.
- Frontend still uploads files sequentially in chunks, verifies the final offset before reporting success, and keeps the low-memory mobile chunk sizes.
- Chat UI, timer, message types, calls, and database schema were not intentionally changed.

## Deployment

Replace the Cloudflare repository with the contents of this version, then let Cloudflare Pages/Workers build and deploy it. Keep the existing Worker secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. No new SQL migration is required for this upload-auth change. Do not put the Supabase secret key into a `VITE_*` variable.

## Validation status

The changed TypeScript files were syntax-transpiled and the archive was checked for ZIP integrity. A live Supabase upload and full production build were not run in this environment; verify by sending one small JPG, one larger photo, and one video after deployment.
