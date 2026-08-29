import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ROLES = new Set(['listener', 'dj', 'admin']);

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const db = platform!.env.DB;
	const body = (await request.json()) as { action?: string; value?: unknown };
	const action = body.action;
	const value = body.value;

	if (action === 'active' && typeof value === 'boolean') {
		await db.prepare('UPDATE user SET active = ? WHERE id = ?').bind(value ? 1 : 0, params.id).run();
		return json({ ok: true });
	}

	if (action === 'role' && typeof value === 'string' && ROLES.has(value)) {
		await db.prepare('UPDATE user SET role = ? WHERE id = ?').bind(value, params.id).run();
		return json({ ok: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
