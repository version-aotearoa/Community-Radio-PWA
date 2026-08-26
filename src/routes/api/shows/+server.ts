import { json } from '@sveltejs/kit';
import { createShow, getShowsForDj } from '$lib/server/shows';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = locals.user;
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const shows = await getShowsForDj(platform!.env.DB, user.id);
	return json(shows);
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const user = locals.user;
	if (!user || (user.role !== 'dj' && user.role !== 'admin')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	const body = (await request.json()) as {
		title?: string;
		description?: string;
		dayOfWeek?: number;
		startMinutes?: number;
		durationMinutes?: number;
		intervalWeeks?: number;
	};
	const dayOfWeek = Number(body.dayOfWeek);
	const startMinutes = Number(body.startMinutes);
	const durationMinutes = Number(body.durationMinutes) || 60;

	if (!body.title || !Number.isInteger(dayOfWeek) || !Number.isInteger(startMinutes)) {
		return json({ error: 'title, dayOfWeek and startMinutes are required' }, { status: 400 });
	}

	const show = await createShow(platform!.env.DB, {
		djId: user.id,
		title: body.title,
		description: body.description,
		dayOfWeek,
		startMinutes,
		durationMinutes,
		intervalWeeks: Number(body.intervalWeeks) || 1
	});
	return json(show, { status: 201 });
};
