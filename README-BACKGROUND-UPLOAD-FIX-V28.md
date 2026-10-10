# SYNAX V28 — Chat Background Upload Fix

This build fixes the shared chat background upload path for Cloudflare Workers.

## What changed

- The `/api/chat/background/upload` route now runs **before** the global JSON/urlencoded body parsers.
- Raw request bodies are normalized from either `Buffer` or `Uint8Array`.
- The browser sends a binary `application/octet-stream` body and passes the actual image MIME type through `X-Synax-Content-Type`.
- The server uses the real image MIME type when uploading to Supabase Storage.
- CORS allow-headers include `X-Synax-Content-Type`.
- Server upload errors now return a bounded diagnostic `detail` so failures are visible instead of only showing a generic message.
- Mobile image selection accepts common image extensions even when the browser provides an empty MIME type.

## Deploy

```powershell
npm install
npm run build
npx wrangler deploy
```

Cloudflare Worker secrets remain server-side:

```powershell
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
```

The existing Supabase schema already contains the `synax-uploads` bucket and `synax_chat_settings` table.
