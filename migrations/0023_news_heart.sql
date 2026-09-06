-- Migration number: 0023 2026-09-07

-- Hearts on news posts. Mirrors chat reaction semantics: one heart per
-- identity (user_key = station user id, or 'anon:<deviceKey>' from a cookie),
-- anonymous-friendly, count is global. Dedupe via composite PK.

CREATE TABLE IF NOT EXISTS news_heart (
	post_id TEXT NOT NULL,
	user_key TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	PRIMARY KEY (post_id, user_key)
);

CREATE INDEX IF NOT EXISTS idx_news_heart_post ON news_heart (post_id);
