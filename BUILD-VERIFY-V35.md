# SYNAX V35 Build Verification

## Source
Based on SYNAX V34 (Lag-Free Animations + Desktop Reactions).

## Realtime latency fixes
- Primary message transport: authenticated WebSocket → Cloudflare Durable Object.
- Fresh mobile WebSocket auth returns immediately after session validation.
- Auth no longer waits for Supabase last-seen lookups or bulk delivery reconciliation.
- Presence requests return an in-memory snapshot immediately; full presence refresh runs in the background.
- Per-message WebSocket processing no longer waits for the presence alarm storage operation.
- Message queue + client-message dedup writes are concurrent.
- Temporary pending message IDs are replaced with canonical server IDs.
- Mobile focus/online/pageshow/visibility events immediately restore realtime connectivity.
- Short visible-tab reconnect backoff.

## Client send reliability
- Optimistic message renders first.
- `clientMessageId` reconciliation remains intact.
- Authenticated realtime send waits up to 450 ms for the fresh socket to become ready.
- Realtime message acknowledgement is expected within 1 second; otherwise existing HTTP `/api/messages` fallback is used.
- The HTTP fallback is idempotent and uses the same `clientMessageId`.

## Motion/audio
- Message motion uses transform/opacity only and remains outside the network critical path.
- Send/receive sound initialization is deferred one task so mobile audio startup cannot stall the visible chat UI.

## Syntax validation
Passed TypeScript `transpileModule` syntax checks for:
- `src/services/socket.ts`
- `src/components/ChatRoom.tsx`
- `worker/realtime.ts`
- `worker/index.ts`
- `server.cloudflare.ts`

## Full build
A complete `npm install` / Vite dependency build was not available in this environment because package installation timed out before dependencies were installed. The project should be built with `npm install` and `npm run build` in the deployment environment.
