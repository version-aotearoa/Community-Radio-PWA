import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const { results } = await platform!.env.DB.prepare(
		`SELECT id, name, email, emailVerified, role, active, createdAt
		 FROM user
		 ORDER BY createdAt DESC
		 LIMIT 500`
	).all();
	return json(results);
};
