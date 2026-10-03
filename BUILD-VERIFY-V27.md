# SYNAX Cloudflare V27 verification

Changed files:
- `worker/realtime.ts`
- `src/services/api.ts`
- `src/services/socket.ts`
- `src/components/ChatRoom.tsx`
- `src/components/MessageItem.tsx`
- `server.cloudflare.ts`
- `server.ts` (type compatibility only)

Behavior checks performed by source inspection:
- Chat messages are sent to WebSocket clients before delivery-status persistence.
- `clientMessageId` continues to reconcile optimistic and persisted messages.
- `/api/messages` is explicitly no-store.
- Viewport-based read receipts remain ID-specific and no longer require a duplicate HTTP request when WebSocket delivery is accepted.
- Shared background/file uploads use raw request bodies in the Cloudflare server path.
- `SUPABASE_SECRET_KEY` remains server-side only.

Environment limitation:
- `npm install` could not complete because the execution environment has no npm registry network access (EAI_AGAIN).
- TypeScript static checking therefore reports missing external module/type declarations; no new syntax error was produced by the V27 edits.
