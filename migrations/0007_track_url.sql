-- Migration number: 0007 2026-08-27

-- Per-track external link (e.g. Bandcamp) + resolved numeric embed id.
ALTER TABLE track ADD COLUMN url TEXT;
ALTER TABLE track ADD COLUMN embed_id TEXT;
