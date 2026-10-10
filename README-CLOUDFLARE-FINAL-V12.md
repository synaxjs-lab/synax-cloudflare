# SYNAXJS Cloudflare Final V12

This package is based on the original SYNAXJS project and preserves the original Railway server (`server.ts`) while adding the Cloudflare Worker deployment layer.

## Chat presence semantics
- **Sent / one tick:** no authenticated realtime socket is connected to the recipient.
- **Delivered / two gray ticks:** a recipient socket is authenticated and reachable, even if SYNAX is backgrounded or another app is in the foreground.
- **Read / two blue ticks:** at least one recipient socket reports `chatActive=true`, which requires SYNAX to be visible and focused.
- `chat:active=false` immediately clears ONLINE status while leaving the socket available for background delivery when the platform keeps it alive.

## Reply gesture
- On touch devices, swipe a received message to the right or a sent message to the left to reply.
- Tap the quoted reply preview to jump to the original message and briefly highlight it.

## Chat background
- Use the palette button in the chat header.
- Background selection is stored locally per SYNAX account/device and does not require a database migration.

## Cloudflare deployment
Build command: `npm run build`
Deploy command: `npx wrangler deploy`

Worker secrets: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
