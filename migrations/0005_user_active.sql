-- Migration number: 0005 2026-08-27

-- Application-user deactivation flag (admin moderation). Default active.
ALTER TABLE user ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
