-- Migration number: 0025 2026-09-15

-- Optional subtype for one-off events (kind = 'event'): e.g. 'guest-mix' or
-- 'hifi-session'. NULL for recurring shows and for un-typed events.

ALTER TABLE show ADD COLUMN event_type TEXT;
