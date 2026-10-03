# SYNAXJS — Cloudflare Final V14

This copy is derived from the original SYNAXJS project and keeps the original Railway server (`server.ts`) intact.

## Cloudflare deployment

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker entry: `worker/index.ts`
- Required secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- Durable Object: `SYNAX_REALTIME_HUB`

Do not set a Railway-style application port for the Worker.

## V14 fixes

- Safer Cloudflare startup with no full-session rewrite on every cold start.
- Faster chat opening by mounting a bounded message window instead of thousands of message components.
- Older messages load on demand when scrolling upward.
- Chat page disables the decorative full-screen animation to reduce mobile GPU/CPU load.
- Mobile chat controls use a touch-friendly two-row grid instead of compressed desktop controls.
- Mobile message bubbles avoid expensive backdrop blur while scrolling.
- Background photo loading is non-blocking and large phone images are resized before upload.
- Shared chat background remains synchronized through Supabase + Cloudflare realtime.
- Reply swipe/tap behavior, delivery/read state separation, and message deduplication are preserved.

## Validation performed in the build workspace

- 27 `.ts`/`.tsx` files passed TypeScript parser/transpile syntax checks.
- `package.json` and `wrangler.jsonc` parsed successfully.
- `server.ts`, `index.html`, and `synax-logo.png` match the original source copy byte-for-byte.

A complete fresh dependency installation and live Cloudflare deployment were not performed inside this build workspace; deployment remains the final environment-level check.
