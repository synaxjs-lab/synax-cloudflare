# SYNAX V33 — Cloudflare Durable Object Realtime Fix

## Root cause found from Cloudflare production logs

Cloudflare production was returning HTTP 500 for `GET /ws` with:

```text
TypeError: id.fetch is not a function
```

The Worker was calling `idFromName('main')` and then calling `.fetch()` directly on the returned Durable Object ID. A Durable Object namespace returns an ID; the request must be sent through a Durable Object stub obtained with `namespace.get(id)`.

The same incorrect pattern was also present in the Cloudflare server's realtime broadcast and pending-message helper paths. This prevented the realtime hub from working, which explains the message-delivery delays, failed realtime sends, and the repeated `Realtime broadcast failed` logs.

## V33 changes

- `/ws` now uses `SYNAX_REALTIME_HUB.get(id).fetch(request)`.
- Realtime broadcast now uses a Durable Object stub before calling `fetch()`.
- Chat-message broadcast acknowledgement uses the stub.
- Pending realtime-message lookup uses the stub.
- No application data model, Supabase schema, authentication, UI, or existing Railway `server.ts` behavior was intentionally changed.
- V31's daily midnight reset, typing UI, and message animations are preserved.

## Validation

A repository-wide TypeScript check could not be completed in the sandbox because the project's npm dependencies are not installed. The change was made only at the identified runtime call sites, and all prior source files are preserved.

## Production test

After deployment, verify that Cloudflare logs no longer show:

```text
id.fetch is not a function
```

Then test two authenticated clients on SYNAX:

1. Connect both users.
2. Send a text message in each direction.
3. Confirm messages arrive without refresh.
4. Confirm the typing indicator appears in realtime.
5. Refresh both clients and confirm messages remain.
