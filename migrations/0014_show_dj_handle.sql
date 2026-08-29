-- Migration number: 0014 2026-08-30

-- Per-show DJ display handle. Empty/NULL falls back to the DJ account's
-- name everywhere dj_name is surfaced (COALESCE in queries).
ALTER TABLE show ADD COLUMN dj_handle TEXT;
