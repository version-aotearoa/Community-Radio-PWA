import { json } from '@sveltejs/kit';
import {
	createShow,
	findOverlappingShows,
	getAllShows,
	getShowsForDj,
	nextCycleWeekDate,
	todayStr,
	weekdayOf
} from '$lib/server/shows';
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
		pageContent?: string;
		image?: string;
		dayOfWeek?: number;
		startMinutes?: number;
		durationMinutes?: number;
		intervalWeeks?: number;
		cycleWeek?: number;
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
	const intervalWeeks = Number(body.intervalWeeks) || 1;

	if (!body.title) return json({ error: 'title is required' }, { status: 400 });
	if (isEvent && (typeof body.date !== 'string' || !DATE_RE.test(body.date))) {
		return json({ error: 'Events need a valid date (YYYY-MM-DD)' }, { status: 400 });
	}
	if (!Number.isInteger(dayOfWeek) || !Number.isInteger(startMinutes)) {
		return json({ error: 'title, dayOfWeek and startMinutes are required' }, { status: 400 });
	}

	let anchorDate: string | undefined;
	if (!isEvent && body.cycleWeek !== undefined) {
		const cw = Number(body.cycleWeek);
		if (!Number.isInteger(cw) || cw < 1 || cw > 4) {
			return json({ error: 'cycleWeek must be 1–4' }, { status: 400 });
		}
		if (intervalWeeks !== 2 && intervalWeeks !== 4) {
			return json({ error: 'cycleWeek only applies to shows repeating every 2 or 4 weeks' }, { status: 400 });
		}
		anchorDate = nextCycleWeekDate(dayOfWeek, cw, todayStr());
	}

	try {
		const show = await createShow(platform!.env.DB, {
			djId: user.id,
			title: body.title,
			description: body.description,
			pageContent: body.pageContent,
			image: typeof body.image === 'string' ? body.image : undefined,
			dayOfWeek,
			startMinutes,
			durationMinutes,
			intervalWeeks,
			anchorDate,
			kind: isEvent ? 'event' : 'show',
			date: isEvent ? body.date : undefined,
			replayUrl: body.replayUrl
		});
		const overlap = await findOverlappingShows(platform!.env.DB, {
			date: isEvent ? body.date : undefined,
			dayOfWeek,
			startMinutes,
			durationMinutes,
			excludeShowId: show.id
		});
		return json({ ...show, overlap }, { status: 201 });
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Could not create show' },
			{ status: 400 }
		);
	}
};
