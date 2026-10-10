# SYNAX Cloudflare Final V16

## Current UI rebuild

This build continues from the Cloudflare project while keeping the original SYNAXJS application as the functional source of truth.

### Header
- Compact identity header on desktop and mobile.
- Header shows avatar, name, Online/Last seen, and a single Settings control.
- Calls, search, theme/background, profile settings, and logout are moved into the Settings menu.
- Desktop uses a compact dropdown; mobile uses a bottom sheet.
- The session timer remains visible on desktop and is shown as a compact floating pill on mobile so it does not widen the header.

### Mobile
- Mobile is not a scaled-down desktop toolbar.
- Touch-friendly settings rows and bottom-sheet presentation.
- Search opens in a temporary utility strip instead of permanently increasing the header.
- Safe-area/viewport measurements remain dynamic for the chat scroll area and composer.

### Preserved architecture
- Cloudflare Worker API
- Durable Object realtime
- Supabase persistence
- Existing authentication, messaging, replies, reactions, editing/deletion, files, voice, calls, presence, ticks, shared backgrounds, and admin functionality
- Original `server.ts` retained for the Railway/reference implementation

## Cloudflare secrets
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Never expose `SUPABASE_SECRET_KEY` through client-side `VITE_*` variables.
