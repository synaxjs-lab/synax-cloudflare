SYNAX Cloudflare V20 verification

Scope:
- Realtime presence reliability
- Delivery/read tick reliability
- Actual-viewport read receipts

Changed files:
- worker/realtime.ts
- src/services/socket.ts
- src/services/api.ts
- src/components/ChatRoom.tsx
- src/components/MessageItem.tsx
- server.cloudflare.ts

Static validation:
- Changed TypeScript/TSX files transpile successfully with TypeScript 5.8.3.
- `chat:active` no longer marks the whole conversation read.
- `chat:mark_read` accepts specific message IDs.
- Message rows expose `data-message-id` for viewport-based read detection.
- Application heartbeat carries Page Visibility state every 10 seconds.
- Durable Object prunes stale sockets after 25 seconds and no longer counts them for presence/delivery.
- Receipt reconciliation uses `/api/messages/receipts` instead of repeated full-history downloads.
- Original `server.ts` is preserved.
- Cloudflare Worker entrypoint and Durable Object binding remain present.

Environment limitation:
- Full npm dependency installation/build could not be completed in the execution environment because `npm install` timed out. The changed files were still parsed successfully with the installed TypeScript compiler.
