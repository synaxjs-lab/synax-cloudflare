# V41 Validation

- Replaced signed TUS upload-token creation (`x-signature`) with Worker-authenticated TUS session creation and chunk/offset requests.
- Browser requests no longer carry a Supabase Storage token; Worker-side Supabase credentials remain server-only.
- Normalized TUS `Location` headers to absolute URLs.
- Preserved sequential chunks, retries, authoritative offset checks, low-memory mobile chunk sizes, multi-select attachment queue, and message reconciliation.
- TypeScript syntax-transpilation and ZIP integrity checks passed in the build sandbox.
- Full Vite production build and real hosted Supabase/device upload testing were not available here; do not consider this live-verified until testing after deployment.
