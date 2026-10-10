# SYNAX V40 — Multi-image and mobile low-memory upload fix

This version is based on V39 and keeps its timer reliability, resumable video path, calls, realtime, messaging, and existing UI.

## Focused changes

- The attachment picker now accepts multiple files instead of processing only `files[0]`.
- Selected files are uploaded and sent sequentially, one at a time. A single failure is reported, but does not cancel the rest of the selection.
- The progress area shows the current item (`2/8: filename`) and aggregate percentage for the selected batch.
- Photos and videos both use the existing Supabase TUS/resumable route rather than sending the full binary to the Worker in one request.
- Chunk sizes adapt to the device: lower-memory mobile devices use 1 MiB chunks; other mobile devices use 2 MiB; desktop uses 4 MiB.
- Upload retries always re-check Supabase's authoritative upload offset before slicing the next chunk. This avoids re-sending a stale/empty chunk when a network response is lost after Supabase has already accepted it.
- Final upload progress reaches 100% only after the server-side upload offset verifies the entire file is stored.
- The Worker no longer needs to buffer complete image/video uploads in the raw `/api/upload` path. Non-image/video documents keep their existing upload path.

## Database / Supabase

No new Supabase migration, table, bucket, or secret is required for V40. It reuses the existing `synax-uploads` bucket and `/api/upload/resumable` route. The configured Supabase Storage limit for the bucket must still allow the size of media being sent.

## Verification

The changed TypeScript/TSX files passed TypeScript transpile syntax checks. A full `npm run build` could not be completed in the sandbox because installing dependencies timed out, so run the normal build/deploy pipeline after extracting this ZIP.
