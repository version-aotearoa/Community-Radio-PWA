import { json } from '@sveltejs/kit';
import { createShow, getAllShows, getShowsForDj, weekdayOf } from '$lib/server/shows';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = locals.user;
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const shows =
		user.role === 'admin'
			? await getAllShows(platform!.env.DB)
			: await getShowsForDj(platform!.env.DB, user.id);
	return json(shows);
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const user = locals.user;
	if (!user || user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const body = (await request.json()) as {
		title?: string;
		description?: string;
		dayOfWeek?: number;
		startMinutes?: number;
		durationMinutes?: number;
		intervalWeeks?: number;
		kind?: string;
		date?: string;
		replayUrl?: string;
	};

	const isEvent = body.kind === 'event';
	const dayOfWeek = isEvent
		? weekdayOf(typeof body.date === 'string' ? body.date : '')
		: Number(body.dayOfWeek);
	const startMinutes = Number(body.startMinutes);
	const durationMinutes = Number(body.durationMinutes) || 60;

	if (!body.title) return json({ error: 'title is required' }, { status: 400 });
	if (isEvent && (typeof body.date !== 'string' || !DATE_RE.test(body.date))) {
		return json({ error: 'Events need a valid date (YYYY-MM-DD)' }, { status: 400 });
	}
	if (!Number.isInteger(dayOfWeek) || !Number.isInteger(startMinutes)) {
		return json({ error: 'title, dayOfWeek and startMinutes are required' }, { status: 400 });
	}

	try {
		const show = await createShow(platform!.env.DB, {
			djId: user.id,
			title: body.title,
			description: body.description,
			dayOfWeek,
			startMinutes,
			durationMinutes,
			intervalWeeks: Number(body.intervalWeeks) || 1,
			kind: isEvent ? 'event' : 'show',
			date: isEvent ? body.date : undefined,
			replayUrl: body.replayUrl
		});
		return json(show, { status: 201 });
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Could not create show' },
			{ status: 400 }
		);
	}
};
