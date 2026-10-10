# SYNAX V34 — Lag-Free Chat Motion + Desktop Reactions

## Changes

- Removed the message-row entrance animation that could animate the whole chat row and interfere with swipe transforms/scroll performance.
- New-message motion is now opt-in and only applies to messages explicitly marked as fresh by `ChatRoom`.
- Fresh message motion is a 120ms transform/opacity animation on the message bubble only; it does not wait for or block message delivery.
- Added a 130ms send-button micro-animation. The message itself remains immediately visible through the existing optimistic send flow.
- Added a lightweight reaction burst animation when a user reacts.
- Reaction state is now optimistic: the selected reaction updates immediately while the server request reconciles the authoritative result.
- Desktop reaction picker is rendered in a portal with a fixed position calculated from the reaction button, preventing it from being clipped by the chat scroll container/header and making desktop reactions clickable.
- Existing mobile reaction picker remains intact.
- Typing indicator and realtime transport were not redesigned in this version.
- Existing V33 Durable Object realtime fixes are preserved.

## Validation

The TypeScript compiler was run against the project without dependencies installed. It reported the expected missing-module/environment errors from the uninstalled project dependencies, but no syntax/parse error from the V34 changes was reported.
