import { slugify } from './shows';
import { DESCRIPTION_MAX, descriptionToText, sanitizeDescription } from './sanitize';

export interface NewsRow {
	id: string;
	title: string;
	body: string;
	image: string | null;
	published: number;
	created_at: number;
	updated_at: number;
}

export interface NewsListItem extends NewsRow {
	/** Plain-text extract of body for list cards / teasers. */
	bodyText: string;
}

/** Max length of a news post title. */
export const NEWS_TITLE_MAX = 200;

/** Max length of the stored image URL. */
export const NEWS_IMAGE_MAX = 500;

const now = () => Math.floor(Date.now() / 1000);

/**
 * Read-path clean: title is trimmed/capped plain text; body passes the same
 * server-side HTML sanitizer used for shows/site content so anything rendered
 * with `{@html}` on public pages is safe; image is blank-normalized.
 */
function sanitizeNewsRow<T extends NewsRow>(row: T): T {
	return {
		...row,
		title: row.title.trim().slice(0, NEWS_TITLE_MAX),
		body: sanitizeDescription(row.body).slice(0, DESCRIPTION_MAX),
		image: row.image?.trim() || null
	};
}

function toListItem<T extends NewsRow>(row: T): NewsListItem {
	const clean = sanitizeNewsRow(row);
	return { ...clean, bodyText: descriptionToText(clean.body) };
}

export async function listNews(
	db: D1Database,
	publishedOnly = false
): Promise<NewsListItem[]> {
	const where = publishedOnly ? 'WHERE published = 1' : '';
	const { results } = await db
		.prepare(`SELECT * FROM news_post ${where} ORDER BY created_at DESC`)
		.all();
	return (results as unknown as NewsRow[]).map(toListItem);
}

export async function getNews(db: D1Database, id: string): Promise<NewsRow | null> {
	const row = (await db.prepare('SELECT * FROM news_post WHERE id = ?').bind(id).first()) as
		| NewsRow
		| null;
	return row ? sanitizeNewsRow(row) : null;
}

/** Unique slug id: base, then base-2, base-3, … until unused. */
async function uniqueNewsId(db: D1Database, base: string): Promise<string> {
	if (!(await db.prepare('SELECT id FROM news_post WHERE id = ?').bind(base).first())) return base;
	for (let n = 2; ; n++) {
		const candidate = `${base}-${n}`;
		if (!(await db.prepare('SELECT id FROM news_post WHERE id = ?').bind(candidate).first())) {
			return candidate;
		}
	}
}

export async function createNews(
	db: D1Database,
	input: { title: string; body?: string; image?: string | null; published?: boolean }
): Promise<NewsRow> {
	const t = now();
	const title = input.title.trim().slice(0, NEWS_TITLE_MAX);
	const image = input.image?.trim().slice(0, NEWS_IMAGE_MAX) || null;
	const id = await uniqueNewsId(db, slugify(title));
	await db
		.prepare(
			`INSERT INTO news_post (id, title, body, image, published, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			title,
			sanitizeDescription(input.body ?? '').slice(0, DESCRIPTION_MAX),
			image,
			input.published ? 1 : 0,
			t,
			t
		)
		.run();
	return (await getNews(db, id)) as NewsRow;
}

export async function updateNews(
	db: D1Database,
	id: string,
	input: { title?: string; body?: string; image?: string | null; published?: boolean }
): Promise<NewsRow | null> {
	const existing = await db.prepare('SELECT * FROM news_post WHERE id = ?').bind(id).first();
	if (!existing) return null;
	const t = now();
	const cols: string[] = [];
	const vals: (string | number | null)[] = [];
	const push = (col: string, val: string | number | null) => {
		cols.push(`${col} = ?`);
		vals.push(val);
	};
	if (input.title !== undefined) {
		push('title', input.title.trim().slice(0, NEWS_TITLE_MAX));
	}
	if (input.body !== undefined) {
		push('body', sanitizeDescription(input.body).slice(0, DESCRIPTION_MAX));
	}
	if (input.image !== undefined) {
		const image = input.image?.trim().slice(0, NEWS_IMAGE_MAX) || null;
		push('image', image);
	}
	if (input.published !== undefined) {
		push('published', input.published ? 1 : 0);
	}
	push('updated_at', t);
	await db.prepare(`UPDATE news_post SET ${cols.join(', ')} WHERE id = ?`).bind(...vals, id).run();
	return getNews(db, id);
}

export async function deleteNews(db: D1Database, id: string): Promise<boolean> {
	const res = await db.prepare('DELETE FROM news_post WHERE id = ?').bind(id).run();
	return (res.meta.changes ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Hearts                                                              */
/* ------------------------------------------------------------------ */

/** Cookie holding the anonymous device key used for hearts without sign-in. */
export const VR_ANON_COOKIE = 'vr_anon';

export interface NewsPostWithHeart extends NewsListItem {
	heartCount: number;
	myHeart: boolean;
}

/**
 * Identity key for a heart: the signed-in user id when present, otherwise an
 * anonymous device key from the vr_anon cookie (`anon:<key>`). Null only when
 * there is no signed-in user and no cookie (a visitor who has never hearted).
 */
export function heartKeyOf(userId: string | null | undefined, anonKey: string | null): string | null {
	if (userId) return userId;
	return anonKey ? `anon:${anonKey}` : null;
}

export async function heartCounts(db: D1Database, postIds: string[]): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};
	if (postIds.length === 0) return counts;
	const { results } = await db
		.prepare(
			`SELECT post_id, COUNT(*) AS c FROM news_heart
			 WHERE post_id IN (${postIds.map(() => '?').join(',')})
			 GROUP BY post_id`
		)
		.bind(...postIds)
		.all();
	for (const r of results as unknown as { post_id: string; c: number }[]) {
		counts[r.post_id] = Number(r.c);
	}
	return counts;
}

/** Post ids the identity has hearted (empty for null identity). */
async function heartedPostIds(db: D1Database, postIds: string[], key: string | null): Promise<Set<string>> {
	const set = new Set<string>();
	if (!key || postIds.length === 0) return set;
	const { results } = await db
		.prepare(
			`SELECT post_id FROM news_heart
			 WHERE user_key = ? AND post_id IN (${postIds.map(() => '?').join(',')})`
		)
		.bind(key, ...postIds)
		.all();
	for (const r of results as unknown as { post_id: string }[]) set.add(r.post_id);
	return set;
}

/** True if the identity has hearted the post. */
export async function myHeart(db: D1Database, postId: string, key: string | null): Promise<boolean> {
	if (!key) return false;
	return Boolean(
		await db
			.prepare('SELECT 1 AS x FROM news_heart WHERE post_id = ? AND user_key = ?')
			.bind(postId, key)
			.first()
	);
}

/** Attach heartCount + myHeart to a set of posts in one round-trip. */
export async function attachHearts(
	db: D1Database,
	posts: NewsListItem[],
	key: string | null
): Promise<NewsPostWithHeart[]> {
	if (posts.length === 0) return [];
	const ids = posts.map((p) => p.id);
	const [counts, mine] = await Promise.all([heartCounts(db, ids), heartedPostIds(db, ids, key)]);
	return posts.map((p) => ({ ...p, heartCount: counts[p.id] ?? 0, myHeart: mine.has(p.id) }));
}

/**
 * Toggle the identity's heart on a post. Idempotent per identity: returns the
 * resulting state and the fresh global count.
 */
export async function toggleHeart(
	db: D1Database,
	postId: string,
	key: string
): Promise<{ hearted: boolean; count: number }> {
	const existing = await db
		.prepare('SELECT 1 AS x FROM news_heart WHERE post_id = ? AND user_key = ?')
		.bind(postId, key)
		.first();
	if (existing) {
		await db
			.prepare('DELETE FROM news_heart WHERE post_id = ? AND user_key = ?')
			.bind(postId, key)
			.run();
	} else {
		await db
			.prepare('INSERT INTO news_heart (post_id, user_key, created_at) VALUES (?, ?, ?)')
			.bind(postId, key, now())
			.run();
	}
	const row = (await db
		.prepare('SELECT COUNT(*) AS c FROM news_heart WHERE post_id = ?')
		.bind(postId)
		.first()) as { c: number };
	return { hearted: !existing, count: Number(row.c) };
}
