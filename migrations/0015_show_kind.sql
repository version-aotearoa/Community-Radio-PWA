-- Migration number: 0015 2026-08-30

-- One-off "event" shows: a single broadcast (upcoming or archive), no
-- weekly recurrence. kind = 'show' is the default recurring show.
ALTER TABLE show ADD COLUMN kind TEXT NOT NULL DEFAULT 'show';
