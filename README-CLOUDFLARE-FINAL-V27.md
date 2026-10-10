# SYNAX Cloudflare Final V27

V27 is built from the uploaded V26 release and focuses on the remaining chat latency and upload reliability problems without changing the SYNAX product structure.

## Realtime chat
- New messages are broadcast to connected SYNAX clients before the delivery-status database update.
- Delivery receipt persistence runs as Durable Object background work, so a Supabase PATCH cannot delay the message bubble.
- The existing `clientMessageId` idempotency/reconciliation remains in place to prevent optimistic-send duplicates.
- Message history requests use `Cache-Control: no-store` on both client and server, avoiding stale cached GET responses.

## Read receipts
- READ is still granted only for messages that are actually visible in the chat viewport.
- A window must be visible and focused for a message to be considered read.
- Read events are sent over the authenticated WebSocket first; HTTP is used only when the WebSocket cannot accept the event.

## Shared background uploads
- Chat background images remain chat-level shared state in `synax_chat_settings`.
- Images are stored in the existing public `synax-uploads` Supabase Storage bucket.
- Cloudflare background uploads now use a raw image request body rather than multipart parsing, improving compatibility on mobile and desktop browsers.
- Generic chat file/voice/image uploads use the same raw-body transport in the Cloudflare build.
- The Supabase service/secret key remains server-only.

## Validation
- The project was statically checked with the installed TypeScript compiler.
- A full dependency-backed Vite/Cloudflare build could not be run because npm registry access is unavailable in this execution environment, so `node_modules` could not be installed here.
