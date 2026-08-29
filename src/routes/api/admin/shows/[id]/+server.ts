import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const db = platform!.env.DB;
	const body = (await request.json()) as { action?: string; value?: unknown };

	if (body.action === 'dj' && typeof body.value === 'string') {
		const dj = await db
			.prepare(`SELECT id FROM user WHERE id = ? AND role IN ('dj', 'admin')`)
			.bind(body.value)
			.first();
		if (!dj) return json({ error: 'Not a DJ account' }, { status: 400 });

		db.prepare('UPDATE show SET dj_id = ?, updated_at = ? WHERE id = ?')
			.bind(body.value, Math.floor(Date.now() / 1000), params.id)
			.run();
		return json({ ok: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
