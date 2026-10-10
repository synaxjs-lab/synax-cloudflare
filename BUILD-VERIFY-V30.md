# SYNAX V30 verification

Changed:
- server.cloudflare.ts

Static checks:
- Balanced/bracket-aware source rewrite completed.
- Realtime send failure path now throws instead of being swallowed.
- Supabase fallback returns a successful canonical message when persistence succeeds.
- Existing V29 typing/realtime files preserved.

Deployment:
```
npm install
npm run build
npx wrangler deploy
```
