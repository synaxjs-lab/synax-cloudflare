let offsetMs = 0;
let synced = false;

export const ServerClock = {
  sync(serverTimestamp: unknown) {
    const value = Number(serverTimestamp);
    if (!Number.isFinite(value) || value <= 0) return;
    // Smooth tiny jitter but immediately correct large device-clock drift.
    const nextOffset = value - Date.now();
    offsetMs = synced ? Math.round(offsetMs * 0.35 + nextOffset * 0.65) : nextOffset;
    synced = true;
  },

  syncFromHeaders(headers: Headers) {
    const value = headers.get('X-Synax-Server-Time');
    if (value) this.sync(Number(value));
  },

  now() {
    return Date.now() + offsetMs;
  },

  getOffsetMs() {
    return offsetMs;
  },
};
