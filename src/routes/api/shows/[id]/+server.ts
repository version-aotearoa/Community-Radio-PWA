import { json } from '@sveltejs/kit';
import { getShow } from '$lib/server/shows';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
	const user = locals.user;
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const db = platform!.env.DB;
	const show = await getShow(db, params.id);
	if (!show) return json({ error: 'Show not found' }, { status: 404 });
	if (show.dj_id !== user.id && user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = (await request.json()) as {
		title?: string;
		description?: string;
		djId?: string;
		djHandle?: string;
	};

	const columns: string[] = [];
	const values: unknown[] = [];

	if (typeof body.title === 'string') {
		const title = body.title.trim().slice(0, 200);
		if (!title) return json({ error: 'Title is required' }, { status: 400 });
		columns.push('title = ?');
		values.push(title);
	}

	if (typeof body.description === 'string') {
		columns.push('description = ?');
		values.push(body.description.trim().slice(0, 2000));
	}

	if (typeof body.djHandle === 'string') {
		columns.push('dj_handle = ?');
		values.push(body.djHandle.trim().slice(0, 100));
	}

	if (typeof body.djId === 'string') {
		if (user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
		const dj = await db
			.prepare(`SELECT id FROM user WHERE id = ? AND role IN ('dj', 'admin')`)
			.bind(body.djId)
			.first();
		if (!dj) return json({ error: 'Not a DJ account' }, { status: 400 });
		columns.push('dj_id = ?');
		values.push(body.djId);
	}

	if (columns.length === 0) return json({ error: 'Nothing to update' }, { status: 400 });

	columns.push('updated_at = ?');
	values.push(Math.floor(Date.now() / 1000));
	values.push(params.id);

	await db
		.prepare(`UPDATE show SET ${columns.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	return json({ ok: true });
};
