import { json } from '@sveltejs/kit';
import { getShow, replayPlayUrl } from '$lib/server/shows';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
	const db = platform!.env.DB;
	const body = (await request.json()) as {
		showId?: unknown;
		date?: unknown;
		startMinutes?: unknown;
		durationMinutes?: unknown;
		replayUrl?: unknown;
	};

	const showId = typeof body.showId === 'string' ? body.showId.trim() : '';
	const date = typeof body.date === 'string' ? body.date.trim() : '';
	const startMinutes = Number(body.startMinutes);
	const durationMinutes = Number(body.durationMinutes) || 60;
	const replayRaw = typeof body.replayUrl === 'string' ? body.replayUrl.trim() : '';

	if (!showId || !DATE_RE.test(date)) {
		return json({ error: 'Show and a valid date (YYYY-MM-DD) are required' }, { status: 400 });
	}
	if (!Number.isInteger(startMinutes) || startMinutes < 0 || startMinutes >= 1440) {
		return json({ error: 'Start time must be within a day (0–1439)' }, { status: 400 });
	}
	if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) {
		return json({ error: 'Duration must be a positive number of minutes' }, { status: 400 });
	}

	const show = await getShow(db, showId);
	if (!show) return json({ error: 'Show not found' }, { status: 404 });

	const existing = await db
		.prepare('SELECT id FROM broadcast WHERE show_id = ? AND date = ?')
		.bind(showId, date)
		.first();
	if (existing) {
		return json({ error: 'A broadcast already exists for that date' }, { status: 409 });
	}

	const replayUrl = replayRaw ? replayPlayUrl(replayRaw) : null;
	if (replayRaw && !replayUrl) {
		return json(
			{ error: 'Paste a track id (24 hex chars) or an on-demand download link.' },
			{ status: 400 }
		);
	}

	const t = Math.floor(Date.now() / 1000);
	const id = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO broadcast (id, show_id, date, start_minutes, duration_minutes, interval_weeks, replay_url, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(id, showId, date, startMinutes, durationMinutes, show.interval_weeks, replayUrl, t, t)
		.run();

	return json({ ok: true, id });
};
