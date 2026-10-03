SYNAX Call + Mobile UI + Performance Fix V3

Replace these files in your current SYNAX project:
server.ts
src/App.tsx
src/services/socket.ts
src/services/webrtc.ts
src/components/CallModal.tsx
src/components/ChatRoom.tsx
src/components/MessageItem.tsx
src/services/api.ts
src/index.css
supabase-schema.sql

IMPORTANT:
1. Run supabase-schema.sql in the same Supabase project used by SYNAX.
2. The file contains synax_sessions and synax_call_signals with RLS enabled.
3. The browser now polls the shared call mailbox independently of WebSocket, so mobile incoming calls do not depend on WebSocket success.
4. WebRTC uses trickle ICE and supports optional TURN through VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL.
5. Supabase secret/service role keys remain server-only.

Build:
  npm run build

Then:
  git add -A
  git commit -m "Fix cross-device calls, mobile header and performance"
  git push
