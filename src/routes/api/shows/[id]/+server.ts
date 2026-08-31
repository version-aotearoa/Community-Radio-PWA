import { json } from '@sveltejs/kit';
import {
	cycleWeekOf,
	ensureBroadcasts,
	findOverlappingShows,
	getShow,
	nextCycleWeekDate,
	nextDateForWeekday,
	replayPlayUrl,
	todayStr,
	weekdayOf
} from '$lib/server/shows';
import { DESCRIPTION_MAX, sanitizeDescription } from '$lib/server/sanitize';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
		image?: string;
		djId?: string;
		djHandle?: string;
		dayOfWeek?: number | string;
		startMinutes?: number | string;
		durationMinutes?: number | string;
		intervalWeeks?: number | string;
		cycleWeek?: number | string;
		date?: string;
		replayUrl?: string | null;
	};

	const isAdmin = user.role === 'admin';
	const isEvent = show.kind === 'event';

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
		values.push(sanitizeDescription(body.description).slice(0, DESCRIPTION_MAX));
	}

	if (typeof body.djHandle === 'string') {
		columns.push('dj_handle = ?');
		values.push(body.djHandle.trim().slice(0, 100));
	}

	if (typeof body.image === 'string') {
		columns.push('image = ?');
		values.push(body.image.trim().slice(0, 500) || null);
	}

	if (typeof body.djId === 'string') {
		if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });
		// Unchanged DJ is a no-op — placeholder ids (e.g. 'dj-station') must
		// not block unrelated edits.
		if (body.djId !== show.dj_id) {
			const dj = await db
				.prepare(`SELECT id FROM user WHERE id = ? AND role IN ('dj', 'admin')`)
				.bind(body.djId)
				.first();
			if (!dj) return json({ error: 'Not a DJ account' }, { status: 400 });
			columns.push('dj_id = ?');
			values.push(body.djId);
		}
	}

	// ---- admin-only schedule / event fields (diff-based: only real changes) ----
	let scheduleChanged = false;
	let newDow: number | null = null;
	let eventDate: string | null = null;
	let eventStart: number | null = null;
	let eventReplay: string | null | undefined;

	if (isAdmin) {
		if (body.dayOfWeek !== undefined) {
			const dow = Number(body.dayOfWeek);
			if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
				return json({ error: 'Day must be 0–6' }, { status: 400 });
			}
			if (dow !== show.day_of_week) {
				columns.push('day_of_week = ?');
				values.push(dow);
				scheduleChanged = true;
				newDow = dow;
			}
		}

		if (body.startMinutes !== undefined) {
			const sm = Number(body.startMinutes);
			if (!Number.isInteger(sm) || sm < 0 || sm >= 1440) {
				return json({ error: 'Start time must be within a day' }, { status: 400 });
			}
			if (sm !== show.start_minutes) {
				columns.push('start_minutes = ?');
				values.push(sm);
				scheduleChanged = true;
				eventStart = sm;
			}
		}

		if (body.durationMinutes !== undefined) {
			const dm = Number(body.durationMinutes);
			if (!Number.isInteger(dm) || dm <= 0 || dm > 1440) {
				return json({ error: 'Duration must be a positive number of minutes' }, { status: 400 });
			}
			if (dm !== show.duration_minutes) {
				columns.push('duration_minutes = ?');
				values.push(dm);
				scheduleChanged = true;
			}
		}

		if (body.intervalWeeks !== undefined) {
			const iw = Number(body.intervalWeeks);
			if (![1, 2, 4].includes(iw)) {
				return json({ error: 'Repeats must be 1, 2 or 4' }, { status: 400 });
			}
			if (iw !== show.interval_weeks) {
				columns.push('interval_weeks = ?');
				values.push(iw);
				scheduleChanged = true;
			}
		}

		if (body.cycleWeek !== undefined) {
			if (isEvent) return json({ error: 'cycleWeek is show-only' }, { status: 400 });
			if (show.interval_weeks !== 2 && show.interval_weeks !== 4) {
				return json({ error: 'cycleWeek only applies to shows repeating every 2 or 4 weeks' }, { status: 400 });
			}
			const cw = Number(body.cycleWeek);
			if (!Number.isInteger(cw) || cw < 1 || cw > 4) {
				return json({ error: 'cycleWeek must be 1–4' }, { status: 400 });
			}
			const current = cycleWeekOf(
				show.anchor_date ?? nextDateForWeekday(show.day_of_week, todayStr())
			);
			if (cw !== current) {
				columns.push('anchor_date = ?');
				values.push(nextCycleWeekDate(show.day_of_week, cw, todayStr()));
				scheduleChanged = true;
			}
		}

		if (body.date !== undefined) {
			if (!isEvent) return json({ error: 'date is event-only' }, { status: 400 });
			const d = String(body.date).trim();
			if (!DATE_RE.test(d)) {
				return json({ error: 'Events need a valid date (YYYY-MM-DD)' }, { status: 400 });
			}
			if (d !== show.anchor_date) {
				columns.push('anchor_date = ?');
				values.push(d);
				columns.push('day_of_week = ?');
				values.push(weekdayOf(d));
				eventDate = d;
			}
		}

		if (body.replayUrl !== undefined) {
			if (!isEvent) return json({ error: 'replayUrl is event-only' }, { status: 400 });
			const raw = String(body.replayUrl ?? '').trim();
			const canonical = raw ? replayPlayUrl(raw) : null;
			if (raw && !canonical) {
				return json(
					{ error: 'Paste a track id (24 hex chars) or an on-demand download link.' },
					{ status: 400 }
				);
			}
			eventReplay = canonical;
		}
	}

	if (columns.length === 0 && !scheduleChanged && eventReplay === undefined) {
		return json({ error: 'Nothing to update' }, { status: 400 });
	}

	const t = Math.floor(Date.now() / 1000);
	if (columns.length > 0) {
		if (scheduleChanged && !isEvent && newDow !== null) {
			// Real day change: re-phase the schedule to the next occurrence.
			columns.push('anchor_date = ?');
			values.push(nextDateForWeekday(newDow, todayStr()));
		}
		columns.push('updated_at = ?');
		values.push(t);
		values.push(params.id);
		await db.prepare(`UPDATE show SET ${columns.join(', ')} WHERE id = ?`).bind(...values).run();
	}

	if (isEvent) {
		const bcols: string[] = [];
		const bvals: unknown[] = [];
		if (eventDate !== null) {
			bcols.push('date = ?');
			bvals.push(eventDate);
		}
		if (eventStart !== null) {
			bcols.push('start_minutes = ?');
			bvals.push(eventStart);
		}
		if (eventReplay !== undefined) {
			bcols.push('replay_url = ?');
			bvals.push(eventReplay);
		}
		if (bcols.length > 0) {
			bcols.push('updated_at = ?');
			bvals.push(t);
			bvals.push(show.id);
			await db
				.prepare(`UPDATE broadcast SET ${bcols.join(', ')} WHERE show_id = ?`)
				.bind(...bvals)
				.run();
		}
	} else if (scheduleChanged) {
		// Regenerate future broadcasts, anchored at the first phase date on or
		// after today so the cycle week can never drift.
		await db
			.prepare('DELETE FROM broadcast WHERE show_id = ? AND date >= ?')
			.bind(show.id, todayStr())
			.run();
		const fresh = await getShow(db, show.id);
		if (fresh) await ensureBroadcasts(db, fresh, 12, todayStr());
	}

	const fresh = await getShow(db, show.id);
	let overlap: { id: string; title: string }[] = [];
	if (fresh && (scheduleChanged || eventDate !== null || eventStart !== null)) {
		overlap = await findOverlappingShows(db, {
			date: isEvent ? (eventDate ?? show.anchor_date) ?? undefined : undefined,
			dayOfWeek: fresh.day_of_week,
			startMinutes: fresh.start_minutes,
			durationMinutes: fresh.duration_minutes,
			excludeShowId: show.id
		});
	}

	return json({ ok: true, overlap });
};
