# SYNAX Cloudflare Final Rebuild — V15

This build is based on the supplied SYNAX Cloudflare project while preserving the Railway reference server.

## Rebuild focus

- Cloudflare Worker remains the production entrypoint.
- Durable Object remains the realtime transport.
- Supabase remains the persistent backend.
- `server.ts` is preserved as the Railway/reference implementation.
- `SUPABASE_SECRET_KEY` remains server-side only.
- No Cloudflare-side `server.listen()` dependency is introduced.

## Mobile UX

Mobile is intentionally not a scaled desktop layout.

- Header has a compact identity row.
- Three primary mobile actions are shown: Search, Call/Theme, More.
- Secondary actions use a bottom sheet.
- Touch targets are at least 48px high.
- Profile, theme, video call and exit are organized inside the mobile action sheet.
- Chat viewport padding is measured from the real header and composer heights.
- Safe-area insets are respected.
- Keyboard/search/reply changes cannot rely on brittle fixed top/bottom padding.
- Desktop keeps its fuller toolbar.

## Performance

- The full-screen cinematic canvas renders a single frame on low-power/mobile devices instead of running a continuous RAF particle/gradient loop.
- Chat background loading remains non-blocking.
- Message history remains windowed.
- Realtime remains the normal message path; polling is only a disconnected fallback.
- Existing message deduplication/client message IDs remain intact.

## Required Supabase setup

Run `supabase-schema.sql` against the Cloudflare Supabase project before using authentication, messaging, uploads, shared backgrounds, presence, or calls.

Required Worker secrets:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Do not place `SUPABASE_SECRET_KEY` in Vite/client environment variables.

## Deployment

Build locally:

```bash
npm install
npm run build:cloudflare
```

Deploy:

```bash
npx wrangler deploy
```

The Worker entrypoint is `worker/index.ts`.

## Validation performed

- `server.ts` was not modified.
- Cloudflare files contain no `server.listen()` calls.
- Durable Object binding is present.
- Shared chat background schema is present.
- Client source does not contain `SUPABASE_SECRET_KEY`.
- TypeScript syntax checks for the changed source files reported no syntax diagnostics.
