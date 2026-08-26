export interface ShowRow {
	id: string;
	dj_id: string;
	title: string;
	description: string;
	day_of_week: number;
	start_minutes: number;
	duration_minutes: number;
	interval_weeks: number;
	anchor_date: string | null;
	active: number;
	created_at: number;
	updated_at: number;
}

export interface BroadcastRow {
	id: string;
	show_id: string;
	date: string; // YYYY-MM-DD (Pacific/Auckland calendar date)
	start_minutes: number;
	duration_minutes: number;
	interval_weeks: number;
	replay_url: string | null;
	created_at: number;
	updated_at: number;
}

import { extractReplayTrackId, replayPlayUrl as azReplayPlayUrl } from '$lib/azuracast';

export interface TrackRow {
	id: string;
	show_id: string;
	broadcast_id: string | null;
	position: number;
	title: string;
	artist: string;
	album: string;
	duration_seconds: number | null;
	created_at: number;
	updated_at: number;
}

export interface TrackInput {
	title: string;
	artist?: string;
	album?: string;
}

const now = () => Math.floor(Date.now() / 1000);

/* ------------------------------------------------------------------ */
/* Date helpers (calendar-date only; safe across TZ/DST)               */
/* ------------------------------------------------------------------ */

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

export function toDateStr(d: Date): string {
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayStr(): string {
	return toDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
	const [y, m, d] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	date.setUTCDate(date.getUTCDate() + days);
	return toDateStr(date);
}

export function weekdayOf(dateStr: string): number {
	const [y, m, d] = dateStr.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

/** Next (or current) date <= fromDate matching `dayOfWeek`... find result >= fromDate. */
export function nextDateForWeekday(dayOfWeek: number, fromDate: string): string {
	const cur = weekdayOf(fromDate);
	const diff = (dayOfWeek - cur + 7) % 7;
	return addDays(fromDate, diff);
}

/* ------------------------------------------------------------------ */
/* Broadcasts                                                          */
/* ------------------------------------------------------------------ */

/**
 * Materialise upcoming broadcasts for a show from its recurrence rule:
 * anchor + k * interval_weeks. Idempotent (UNIQUE(show_id, date)).
 */
export async function ensureBroadcasts(
	db: D1Database,
	show: Pick<ShowRow, 'id' | 'interval_weeks' | 'anchor_date' | 'day_of_week' | 'start_minutes' | 'duration_minutes'>,
 weeks = 12
): Promise<BroadcastRow[]> {
	const scheduleStart = show.anchor_date ?? nextDateForWeekday(show.day_of_week, todayStr());
	const horizon = addDays(todayStr(), weeks * 7);
	const intervalDays = show.interval_weeks * 7;

	const stmts: D1PreparedStatement[] = [];
	let k = 0;
	let date = scheduleStart;
	while (date <= horizon) {
		stmts.push(
			db
				.prepare(
					`INSERT OR IGNORE INTO broadcast (id, show_id, date, start_minutes, duration_minutes, interval_weeks, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					crypto.randomUUID(),
					show.id,
					date,
					show.start_minutes,
					show.duration_minutes,
					show.interval_weeks,
					now(),
					now()
				)
		);
		k += 1;
		date = addDays(scheduleStart, k * intervalDays);
	}
	if (stmts.length > 0) await db.batch(stmts);
	return getBroadcasts(db, show.id);
}

export async function getBroadcasts(db: D1Database, showId: string): Promise<BroadcastRow[]> {
	const { results } = await db
		.prepare('SELECT * FROM broadcast WHERE show_id = ? ORDER BY date')
		.bind(showId)
		.all();
	return results as unknown as BroadcastRow[];
}

/** The show's current broadcast: next upcoming, or latest past if nothing upcoming. */
export async function getActiveBroadcast(db: D1Database, showId: string): Promise<BroadcastRow | null> {
	const upcoming = await db
		.prepare('SELECT * FROM broadcast WHERE show_id = ? AND date >= ? ORDER BY date LIMIT 1')
		.bind(showId, todayStr())
		.first();
	if (upcoming) return upcoming as unknown as BroadcastRow;
	const last = await db
		.prepare('SELECT * FROM broadcast WHERE show_id = ? ORDER BY date DESC LIMIT 1')
		.bind(showId)
		.first();
	return (last as unknown as BroadcastRow) ?? null;
}

export async function getBroadcast(db: D1Database, id: string): Promise<BroadcastRow | null> {
	return db.prepare('SELECT * FROM broadcast WHERE id = ?').bind(id).first() as Promise<BroadcastRow | null>;
}

/**
 * Store (or clear) a broadcast's replay link. Accepts a bare track id or a raw
 * on-demand download URL; stores the canonical absolute play URL.
 * Returns the stored value (null when cleared).
 */
export async function setBroadcastReplayUrl(
	db: D1Database,
	broadcastId: string,
	url: string | null
): Promise<string | null> {
	const replay_url = url ? replayPlayUrl(url) : null;
	await db
		.prepare('UPDATE broadcast SET replay_url = ?, updated_at = ? WHERE id = ?')
		.bind(replay_url, now(), broadcastId)
		.run();
	return replay_url;
}

/** Derive the canonical play URL from a pasted URL or bare track id (or null). */
export function replayPlayUrl(input: string): string | null {
	const id = extractReplayTrackId(input);
	return id ? azReplayPlayUrl(id) : null;
}

/* ------------------------------------------------------------------ */
/* Shows                                                               */
/* ------------------------------------------------------------------ */

export async function getShow(db: D1Database, id: string): Promise<ShowRow | null> {
	return db.prepare('SELECT * FROM show WHERE id = ?').bind(id).first() as Promise<ShowRow | null>;
}

export interface ShowWithDj extends ShowRow {
	dj_name: string | null;
	dj_image: string | null;
}

export async function getShowWithDj(db: D1Database, id: string): Promise<ShowWithDj | null> {
	return db
		.prepare(
			`SELECT s.*, u.name AS dj_name, u.image AS dj_image
			 FROM show s
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE s.id = ?`
		)
		.bind(id)
		.first() as Promise<ShowWithDj | null>;
}

export async function getShowsForDj(db: D1Database, djId: string): Promise<ShowRow[]> {
	const { results } = await db
		.prepare(
			'SELECT * FROM show WHERE dj_id = ? AND active = 1 ORDER BY day_of_week, start_minutes'
		)
		.bind(djId)
		.all();
	return results as unknown as ShowRow[];
}

export async function getAllShows(db: D1Database): Promise<ShowRow[]> {
	const { results } = await db
		.prepare('SELECT * FROM show WHERE active = 1 ORDER BY day_of_week, start_minutes')
		.all();
	return results as unknown as ShowRow[];
}

export interface ScheduleShow extends ShowRow {
	dj_name: string | null;
}

export async function getSchedule(db: D1Database): Promise<ScheduleShow[]> {
	const { results } = await db
		.prepare(
			`SELECT s.*, u.name AS dj_name
			 FROM show s
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE s.active = 1
			 ORDER BY s.day_of_week, s.start_minutes`
		)
		.all();
	return results as unknown as ScheduleShow[];
}

/** Station-wide 4-week cycle anchor (Monday). */
export const CYCLE_ANCHOR = '2026-01-05';

/** 1-4: which week of the 4-week station cycle contains `dateStr`. */
export function cycleWeekOf(dateStr: string): number {
	const [y, m, d] = dateStr.split('-').map(Number);
	const [ay, am, ad] = CYCLE_ANCHOR.split('-').map(Number);
	const ms = new Date(Date.UTC(y, m - 1, d)).getTime() - new Date(Date.UTC(ay, am - 1, ad)).getTime();
	const weeks = Math.floor(ms / (7 * 24 * 3600 * 1000));
	return ((weeks % 4) + 4) % 4 + 1;
}

export interface UpcomingBroadcast extends BroadcastRow {
	title: string;
	dj_name: string | null;
}

export interface AiringInfo extends UpcomingBroadcast {
	show_id: string;
	dj_image: string | null;
}

/** Broadcast airing right now (date + minutes given in station-local time). */
export async function getOnAirBroadcast(
	db: D1Database,
	date: string,
	minutes: number
): Promise<AiringInfo | null> {
	return db
		.prepare(
			`SELECT b.*, s.title, u.name AS dj_name, u.image AS dj_image
			 FROM broadcast b
			 JOIN show s ON s.id = b.show_id
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE b.date = ? AND b.start_minutes <= ? AND ? < b.start_minutes + b.duration_minutes
			   AND s.active = 1
			 LIMIT 1`
		)
		.bind(date, minutes, minutes)
		.first() as Promise<AiringInfo | null>;
}

/** The next upcoming broadcast on or after `minutes` on/after `date`. */
export async function getNextBroadcast(
	db: D1Database,
	date: string,
	minutes: number
): Promise<AiringInfo | null> {
	return db
		.prepare(
			`SELECT b.*, s.title, u.name AS dj_name, u.image AS dj_image
			 FROM broadcast b
			 JOIN show s ON s.id = b.show_id
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE s.active = 1
			   AND (b.date > ? OR (b.date = ? AND b.start_minutes > ?))
			 ORDER BY b.date, b.start_minutes
			 LIMIT 1`
		)
		.bind(date, date, minutes)
		.first() as Promise<AiringInfo | null>;
}

/** Current date (YYYY-MM-DD) and minutes-since-midnight in a given IANA timezone. */
export function zonedNow(timeZone = 'Pacific/Auckland'): { date: string; minutes: number } {
	const now = new Date();
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	});
	const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		minutes: Number(parts.hour) * 60 + Number(parts.minute)
	};
}

/** Upcoming airings for all active shows within the next `days` days. */
export async function getUpcomingBroadcasts(
	db: D1Database,
	days = 30
): Promise<UpcomingBroadcast[]> {
	const from = todayStr();
	const to = addDays(from, days);
	const { results } = await db
		.prepare(
			`SELECT b.*, s.title, u.name AS dj_name
			 FROM broadcast b
			 JOIN show s ON s.id = b.show_id
			 LEFT JOIN user u ON u.id = s.dj_id
			 WHERE b.date >= ? AND b.date <= ? AND s.active = 1
			 ORDER BY b.date, b.start_minutes`
		)
		.bind(from, to)
		.all();
	return results as unknown as UpcomingBroadcast[];
}

export async function createShow(
	db: D1Database,
	input: {
		djId: string;
		title: string;
		description?: string;
		dayOfWeek: number;
		startMinutes: number;
		durationMinutes: number;
		intervalWeeks?: number;
		anchorDate?: string;
	}
): Promise<ShowRow> {
	const id = crypto.randomUUID();
	const t = now();
	const intervalWeeks = Math.max(1, Math.floor(input.intervalWeeks ?? 1) || 1);
	const anchorDate = input.anchorDate ?? nextDateForWeekday(input.dayOfWeek, todayStr());
	await db
		.prepare(
			`INSERT INTO show (id, dj_id, title, description, day_of_week, start_minutes, duration_minutes, interval_weeks, anchor_date, active, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
		)
		.bind(
			id,
			input.djId,
			input.title.trim(),
			input.description?.trim() ?? '',
			input.dayOfWeek,
			input.startMinutes,
			input.durationMinutes,
			intervalWeeks,
			anchorDate,
			t,
			t
		)
		.run();
	const show = (await getShow(db, id)) as ShowRow;
	await ensureBroadcasts(db, show);
	return show;
}

/* ------------------------------------------------------------------ */
/* Tracklists (per broadcast)                                          */
/* ------------------------------------------------------------------ */

export async function getTracklist(db: D1Database, broadcastId: string): Promise<TrackRow[]> {
	const { results } = await db
		.prepare('SELECT * FROM track WHERE broadcast_id = ? ORDER BY position')
		.bind(broadcastId)
		.all();
	return results as unknown as TrackRow[];
}

/** Tracklists for many broadcasts at once: { [broadcastId]: TrackRow[] }. */
export async function getBroadcastTracksMap(
	db: D1Database,
	broadcastIds: string[]
): Promise<Record<string, TrackRow[]>> {
	const result: Record<string, TrackRow[]> = {};
	if (broadcastIds.length === 0) return result;
	const { results } = await db
		.prepare(
			`SELECT * FROM track WHERE broadcast_id IN (${broadcastIds.map(() => '?').join(',')})
			 ORDER BY broadcast_id, position`
		)
		.bind(...broadcastIds)
		.all();
	for (const row of results as unknown as TrackRow[]) {
		(result[row.broadcast_id ?? ''] ??= []).push(row);
	}
	return result;
}

/** Atomically replaces a broadcast's tracklist (delete + insert in one D1 batch). */
export async function replaceTracklist(
	db: D1Database,
	broadcastId: string,
	tracks: TrackInput[]
): Promise<TrackRow[]> {
	const t = now();
	const broadcast = await getBroadcast(db, broadcastId);
	const stmts = [
		db.prepare('DELETE FROM track WHERE broadcast_id = ?').bind(broadcastId),
		...tracks.map((track, i) =>
			db
				.prepare(
					`INSERT INTO track (id, show_id, broadcast_id, position, title, artist, album, duration_seconds, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
				)
				.bind(
					crypto.randomUUID(),
					broadcast!.show_id,
					broadcastId,
					i,
					track.title.trim().slice(0, 300),
					track.artist?.trim().slice(0, 200) ?? '',
					track.album?.trim().slice(0, 200) ?? '',
					t,
					t
				)
		)
	];
	await db.batch(stmts);
	return getTracklist(db, broadcastId);
}
