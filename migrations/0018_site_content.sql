-- Migration number: 0018 2026-08-31

-- Admin-editable static content (About / Terms), keyed by slug. The Info page
-- falls back to its hardcoded copy until an admin saves content for a key.
CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    body TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT 0
);
