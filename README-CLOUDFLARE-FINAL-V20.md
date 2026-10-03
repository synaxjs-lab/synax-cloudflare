# SYNAX Cloudflare Final V20

## What V20 fixes

V20 fixes realtime presence and read receipts as separate, authoritative states.

### Presence / delivery states

- **1 gray tick**: recipient has no fresh authenticated SYNAX WebSocket connection.
- **2 gray ticks**: recipient has a fresh authenticated SYNAX connection, but the SYNAX tab is hidden/backgrounded.
- **2 blue ticks**: the specific message has actually become visible in the recipient's SYNAX chat viewport and was marked read.
- **Online**: at least one fresh authenticated SYNAX connection reports the SYNAX tab as visible.
- **Offline / Last seen**: no fresh visible SYNAX tab is reported.

### Why the old behavior could fail

The old implementation had two reliability gaps:

1. A browser/mobile session that disappeared without a clean WebSocket close could remain registered inside the Durable Object, causing delivery/presence to become stale.
2. A `chat:messages_read` WebSocket event could be lost. Because the client only reconciled the full message history in limited cases, an outgoing message could remain visually stuck at one tick until a refresh.

### V20 implementation

- Application-level presence heartbeat every 10 seconds, carrying current Page Visibility state.
- Durable Object heartbeat timeout at 25 seconds.
- Durable Object alarm runs every ~15 seconds to prune stale sockets.
- Stale sockets no longer count as connected or online.
- `chat:active` controls presence only; it no longer marks the entire history read.
- Exact message IDs are used for read receipts.
- Read receipts are generated from messages actually visible in the chat viewport.
- `/api/messages/receipts` is a lightweight authoritative status endpoint for the latest 100 outgoing messages.
- The client reconciles pending outgoing statuses every 3 seconds while visible, without downloading the complete chat history.
- A short post-send receipt reconciliation closes race/missed-event gaps.

## Architecture

Browser -> Cloudflare Worker -> Durable Object realtime -> Supabase

The original Railway `server.ts` remains untouched as the reference implementation.

## Required Cloudflare variables

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Keep `SUPABASE_SECRET_KEY` server-side. Do not expose it in a `VITE_*` client variable.
