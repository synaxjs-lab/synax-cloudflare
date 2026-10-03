# SYNAX Cloudflare Final V17

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


## V17 presence and read-receipt contract

The realtime layer intentionally separates reachability, SYNAX-tab presence, and read state:

- **1 gray tick:** recipient has no authenticated SYNAX WebSocket open.
- **2 gray ticks:** recipient has SYNAX open in the browser, but the SYNAX tab is hidden/backgrounded.
- **2 blue ticks:** recipient has the SYNAX tab visible and the chat is active; messages are marked read and the sender receives the read event.
- **Online:** shown only while at least one authenticated SYNAX tab is visible.
- Switching to another browser tab/app changes the recipient to the gray-double-tick/offline state without disconnecting the realtime socket.
- Returning to the SYNAX tab immediately restores Online and read handling.

The session countdown is rendered directly inside the responsive chat header on both desktop and mobile.
