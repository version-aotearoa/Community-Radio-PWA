import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = locals.user;
	if (!user) redirect(302, '/login');

	const db = platform!.env.DB;
	const me = await db.prepare('SELECT created_at FROM user WHERE id = ?').bind(user.id).first();
	const saved = await db
		.prepare(
			`SELECT s.id, s.title, s.image AS image, ss.created_at AS saved_at
			 FROM saved_show ss
			 JOIN show s ON s.id = ss.show_id
			 WHERE ss.user_id = ?
			 ORDER BY ss.created_at DESC`
		)
		.bind(user.id)
		.all();

	return {
		user,
		createdAt: (me?.created_at as number | undefined) ?? null,
		saved: saved.results as { id: string; title: string; image: string | null; saved_at: number }[]
	};
};
