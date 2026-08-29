import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = locals.user;
	if (!user) redirect(302, '/login');

	const db = platform!.env.DB;
	const me = await db.prepare('SELECT created_at FROM user WHERE id = ?').bind(user.id).first();

	const following = await db
		.prepare(
			`SELECT s.id, s.title, s.image AS image, f.created_at AS followed_at
			 FROM follow_show f
			 JOIN show s ON s.id = f.show_id
			 WHERE f.user_id = ?
			 ORDER BY f.created_at DESC`
		)
		.bind(user.id)
		.all();

	const saved = await db
		.prepare(
			`SELECT b.id AS broadcast_id, b.show_id, b.date, s.title, s.image AS image, e.created_at AS saved_at
			 FROM saved_episode e
			 JOIN broadcast b ON b.id = e.broadcast_id
			 JOIN show s ON s.id = b.show_id
			 WHERE e.user_id = ?
			 ORDER BY e.created_at DESC`
		)
		.bind(user.id)
		.all();

	return {
		user,
		createdAt: (me?.created_at as number | undefined) ?? null,
		following: following.results as {
			id: string;
			title: string;
			image: string | null;
			followed_at: number;
		}[],
		saved: saved.results as {
			broadcast_id: string;
			show_id: string;
			date: string;
			title: string;
			image: string | null;
			saved_at: number;
		}[]
	};
};
