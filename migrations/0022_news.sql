-- Migration number: 0022 2026-09-07

-- Admin-authored news posts (text content type, distinct from broadcasts).
-- id is a URL slug; body holds sanitized rich HTML (Tipex output) rendered
-- with {@html}; published gates public visibility (Studio toggle). Optional
-- image is an external URL shown directly, like show.image.

CREATE TABLE IF NOT EXISTS news_post (
	id TEXT PRIMARY KEY NOT NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	image TEXT,
	published INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_post (published, created_at DESC);
