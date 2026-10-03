# SYNAX Cloudflare Final V18

## Realtime presence/read-state rules

- **1 gray tick**: recipient has no authenticated SYNAX WebSocket connection.
- **2 gray ticks**: recipient has a live SYNAX connection, but the SYNAX tab is hidden/backgrounded.
- **2 blue ticks**: recipient's SYNAX tab is visible and the chat is active, so messages can be marked read.
- **Online**: at least one authenticated SYNAX tab reports `document.visibilityState === "visible"`.
- **Offline / Last seen**: no active SYNAX tab is visible.

The implementation deliberately separates **connection/delivery** from **visible-tab/read** state. The Page Visibility API is used for tab visibility; the Durable Object owns the realtime socket/presence state.

## Lifecycle reliability

- `visibilitychange` changes the active/read state without closing the background socket.
- `beforeunload` best-effort closes the realtime socket when the browser/tab is actually exiting, allowing the Durable Object to publish the new last-seen state quickly.
- `pageshow` re-announces the current state after browser back-forward-cache restoration.
- A lightweight realtime presence snapshot is requested every 5 seconds while the chat is visible to recover from missed presence events without requiring a refresh.

## Header

The compact header retains the session timer alongside the identity/status and Settings control on desktop and mobile.

## Cloudflare architecture

Browser -> Cloudflare Worker -> Durable Object realtime -> Supabase

`server.ts` remains the original Railway/reference server and is not rewritten.
