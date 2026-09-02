import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_FEATURED = 3;

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const { results } = await platform!.env.DB.prepare(
		`SELECT b.id, b.date, b.featured, b.home_ready, s.title
		 FROM broadcast b
		 JOIN show s ON s.id = b.show_id
		 WHERE b.replay_url IS NOT NULL AND s.active = 1
		 ORDER BY b.date DESC
		 LIMIT 200`
	).all();
	return json(results);
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const db = platform!.env.DB;
	const body = (await request.json()) as {
		broadcastId?: unknown;
		featured?: unknown;
		ready?: unknown;
	};

	const broadcastId = typeof body.broadcastId === 'string' ? body.broadcastId.trim() : '';
	const featured = body.featured === true;
	const ready = body.ready === true;
	if (!broadcastId) return json({ error: 'broadcastId is required' }, { status: 400 });
	if (body.featured !== undefined && body.ready !== undefined) {
		return json({ error: 'Provide only one of featured or ready' }, { status: 400 });
	}

	const broadcast = await db.prepare('SELECT id FROM broadcast WHERE id = ?').bind(broadcastId).first();
	if (!broadcast) return json({ error: 'Broadcast not found' }, { status: 404 });

	if (body.featured !== undefined) {
		if (featured) {
			const { count } = (await db
				.prepare('SELECT COUNT(*) AS count FROM broadcast WHERE featured = 1')
				.first()) as unknown as { count: number };
			const already = await db
				.prepare('SELECT featured FROM broadcast WHERE id = ?')
				.bind(broadcastId)
				.first() as unknown as { featured: number } | null;
			if ((already?.featured ?? 0) === 0 && count >= MAX_FEATURED) {
				return json({ error: `Max ${MAX_FEATURED} featured episodes` }, { status: 400 });
			}
		}

		await db
			.prepare('UPDATE broadcast SET featured = ?, updated_at = ? WHERE id = ?')
			.bind(featured ? 1 : 0, Math.floor(Date.now() / 1000), broadcastId)
			.run();

		return json({ ok: true, featured });
	}

	await db
		.prepare('UPDATE broadcast SET home_ready = ?, updated_at = ? WHERE id = ?')
		.bind(ready ? 1 : 0, Math.floor(Date.now() / 1000), broadcastId)
		.run();

	return json({ ok: true, ready });
};
