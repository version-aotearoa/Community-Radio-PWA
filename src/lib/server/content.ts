/** Admin-editable static page content (About / Terms), keyed by slug. */

export const CONTENT_KEYS = ['about', 'terms'] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

export function isContentKey(key: string): key is ContentKey {
	return (CONTENT_KEYS as readonly string[]).includes(key);
}

export async function getContent(db: D1Database, key: ContentKey): Promise<string> {
	const row = (await db.prepare('SELECT body FROM site_content WHERE key = ?').bind(key).first()) as
		| { body: string }
		| null;
	return row?.body ?? '';
}

export async function setContent(db: D1Database, key: ContentKey, body: string): Promise<void> {
	await db
		.prepare(
			`INSERT INTO site_content (key, body, updated_at) VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`
		)
		.bind(key, body, Math.floor(Date.now() / 1000))
		.run();
}

export async function clearContent(db: D1Database, key: ContentKey): Promise<void> {
	await db.prepare('UPDATE site_content SET body = ?, updated_at = ? WHERE key = ?').bind('', Math.floor(Date.now() / 1000), key).run();
}
