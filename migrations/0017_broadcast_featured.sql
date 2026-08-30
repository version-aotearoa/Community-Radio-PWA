-- Migration number: 0017 2026-08-30

-- Admin-curated homepage features: flag on broadcast (max 3 enforced in the
-- admin endpoint), ordered by date DESC on the home page.
ALTER TABLE broadcast ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
