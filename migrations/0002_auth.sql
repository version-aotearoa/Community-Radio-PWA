-- Migration number: 0002 	 2026-08-26T04:34:53.951Z

-- Better Auth core tables (SQLite adapter). Dates stored as ISO-8601 UTC strings.
-- `role` is our application additional field on the user model.

CREATE TABLE IF NOT EXISTS user (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	emailVerified INTEGER NOT NULL DEFAULT 0,
	image TEXT,
	role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('listener', 'dj', 'admin')),
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
	id TEXT PRIMARY KEY NOT NULL,
	expiresAt TEXT NOT NULL,
	token TEXT NOT NULL UNIQUE,
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL,
	ipAddress TEXT,
	userAgent TEXT,
	userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_user ON session (userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session (token);

CREATE TABLE IF NOT EXISTS account (
	id TEXT PRIMARY KEY NOT NULL,
	issuer TEXT NOT NULL,
	accountId TEXT NOT NULL,
	providerId TEXT NOT NULL,
	userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
	accessToken TEXT,
	refreshToken TEXT,
	idToken TEXT,
	accessTokenExpiresAt TEXT,
	refreshTokenExpiresAt TEXT,
	scope TEXT,
	password TEXT,
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_issuer_account ON account (issuer, accountId);
CREATE INDEX IF NOT EXISTS idx_account_user ON account (userId);

CREATE TABLE IF NOT EXISTS verification (
	id TEXT PRIMARY KEY NOT NULL,
	identifier TEXT NOT NULL,
	value TEXT NOT NULL,
	expiresAt TEXT NOT NULL,
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification (identifier);
