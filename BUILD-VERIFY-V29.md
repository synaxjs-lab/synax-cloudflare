# SYNAX Cloudflare V29 verification

Changed files:
- worker/realtime.ts
- server.cloudflare.ts
- src/components/ChatRoom.tsx
- src/components/MessageComposer.tsx

Static validation:
- TypeScript/TSX source parsing passed for all changed files using the TypeScript parser.
- Full dependency-backed `tsc --noEmit`/Vite build was not available in the working environment because project node_modules were not installed and registry access was unavailable.

Behavior changes:
- Validated messages are queued in Durable Object storage before being broadcast.
- Supabase message persistence is moved off the user-visible send critical path.
- Durable pending messages are included in `/api/messages` history responses until persisted.
- Client optimistic reconciliation still uses `clientMessageId`.
- Typing indicators are realtime and cleared on idle/blur/send/disconnect.
