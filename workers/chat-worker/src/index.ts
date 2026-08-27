import { DurableObject } from 'cloudflare:workers';

export interface Env {
	CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
	TURNSTILE_SECRET?: string;
	TURNSTILE_HOSTNAMES?: string;
	CHAT_ADMIN_TOKEN?: string;
	// Shared with the app: signs short-lived chat identities (uid + display name).
	CHAT_IDENTITY_SECRET?: string;
}

export interface ChatMessage {
	id: string;
	ts: number;
	name: string;
	content: string;
	userId: string | null;
	reactions?: Record<string, number>;
	my?: string[];
}

interface ConnectionMeta {
	name: string;
	uid: string | null;
	pid: string | null;
	lastTs: number;
}

interface IdentityPayload {
	uid: string;
	name: string;
	exp: number;
}

const HISTORY_LIMIT = 100;
const MAX_STORED = 1000;
const RATE_LIMIT_MS = 500;
const MAX_CONTENT_LENGTH = 500;
const MAX_NAME_LENGTH = 40;

/**
 * Per-room chat: WebSockets + SQLite persistence. One instance per room (named
 * via `env.CHAT_ROOM.getByName(room)`), so message history is co-located with
 * the live connections that write it.
 */
export class ChatRoom extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => this.migrate());
	}

	/**
	 * SQLite schema lives in the DO's own storage. `PRAGMA user_version` is not
	 * supported in DO SQLite, so track applied migrations in a table instead.
	 */
	private migrate() {
		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
				id INTEGER PRIMARY KEY,
				applied_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);
		const { version } = this.ctx.storage.sql
			.exec<{ version: number }>(
				'SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations'
			)
			.one();
		if (version < 1) {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS messages (
					id TEXT PRIMARY KEY,
					ts INTEGER NOT NULL,
					name TEXT NOT NULL,
					content TEXT NOT NULL
				);
				CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages (ts);
				INSERT INTO _sql_schema_migrations (id) VALUES (1);
			`);
		}
		if (version < 2) {
			this.ctx.storage.sql.exec(`
				ALTER TABLE messages ADD COLUMN user_id TEXT;
				CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_id);
				INSERT INTO _sql_schema_migrations (id) VALUES (2);
			`);
		}
		if (version < 3) {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS chat_meta (
					key TEXT PRIMARY KEY,
					value INTEGER NOT NULL
				);
				INSERT INTO _sql_schema_migrations (id) VALUES (3);
			`);
		}
		if (version < 4) {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS reactions (
					message_id TEXT NOT NULL,
					user_key TEXT NOT NULL,
					emoji TEXT NOT NULL DEFAULT 'heart',
					created_at INTEGER NOT NULL,
					PRIMARY KEY (message_id, user_key, emoji)
				);
				CREATE INDEX IF NOT EXISTS idx_reactions_msg ON reactions (message_id);
				INSERT INTO _sql_schema_migrations (id) VALUES (4);
			`);
		}
	}

	/** Allocate the next anonymous handle: `Listener N` (per room, sequential). */
	private nextListenerName(): string {
		const row = this.ctx.storage.sql
			.exec<{ value: number }>(
				`INSERT INTO chat_meta (key, value) VALUES ('seq', 1)
				 ON CONFLICT(key) DO UPDATE SET value = value + 1
				 RETURNING value`
			)
			.one();
		return `Listener ${row.value}`;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const upgrade = request.headers.get('Upgrade');

		if (upgrade === 'websocket') {
			// Gate the handshake with a Turnstile token when configured.
			if (this.env.TURNSTILE_SECRET) {
				const ok = await verifyTurnstile(
					url.searchParams.get('turnstile'),
					this.env.TURNSTILE_SECRET,
					this.env.TURNSTILE_HOSTNAMES,
					request.headers.get('CF-Connecting-IP')
				);
				if (!ok) {
					return new Response('Forbidden', { status: 403 });
				}
			}
			const token = url.searchParams.get('token');
			let name = (url.searchParams.get('name') || '').slice(0, MAX_NAME_LENGTH);
			let uid: string | null = null;
			if (token) {
				const identity = await this.verifyIdentity(token);
				if (!identity) return new Response('Unauthorized', { status: 401 });
				uid = identity.uid;
				name = identity.name.slice(0, MAX_NAME_LENGTH);
			} else if (!name && url.searchParams.get('anonymous') === '1') {
				name = this.nextListenerName();
			}
			if (!name) name = 'Listener';
			const pid = (url.searchParams.get('pid') || '').slice(0, 64) || null;
			const pair = new WebSocketPair();
			pair[1].serializeAttachment({ name, uid, pid, lastTs: 0 } satisfies ConnectionMeta);
			this.ctx.acceptWebSocket(pair[1]);
			pair[1].send(JSON.stringify({ type: 'history', messages: this.recent(HISTORY_LIMIT, uid ?? pid) }));
			pair[1].send(JSON.stringify({ type: 'name', name }));
			return new Response(null, { status: 101, webSocket: pair[0] });
		}

		// Plain HTTP: health check or history snapshot.
		if (url.pathname === '/api/health') {
			return Response.json({ ok: true });
		}
		if (url.pathname === '/api/history') {
			return Response.json({ messages: this.recent(HISTORY_LIMIT, null) });
		}

		// Admin moderation (bearer token shared with the app).
		const adminOk = this.env.CHAT_ADMIN_TOKEN
			? request.headers.get('authorization') === `Bearer ${this.env.CHAT_ADMIN_TOKEN}`
			: false;
		if (!adminOk) return new Response('Unauthorized', { status: 401 });

		const del = url.pathname.match(/^\/api\/messages\/([A-Za-z0-9-]+)$/);
		if (request.method === 'DELETE' && del) {
			const id = decodeURIComponent(del[1]);
			this.ctx.storage.sql.exec('DELETE FROM reactions WHERE message_id = ?', id);
			const cursor = this.ctx.storage.sql.exec('DELETE FROM messages WHERE id = ?', id);
			cursor.toArray();
			const deleted = cursor.rowsWritten;
			if (deleted > 0) this.broadcast({ type: 'deleted', id });
			return Response.json({ ok: true, deleted });
		}

		if (request.method === 'POST' && url.pathname === '/api/messages/purge') {
			let name = '';
			let userId = '';
			try {
				const body = (await request.json()) as { name?: unknown; userId?: unknown };
				name = String(body.name ?? '').trim();
				userId = String(body.userId ?? '').trim();
			} catch {
				// ignore malformed bodies
			}
			if (userId) {
				this.ctx.storage.sql.exec(
					'DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE user_id = ?)',
					userId
				);
				this.ctx.storage.sql.exec('DELETE FROM messages WHERE user_id = ?', userId);
				this.broadcast({ type: 'purged', userId });
				return Response.json({ ok: true, deleted: 1 });
			}
			if (!name) return Response.json({ ok: false, deleted: 0 }, { status: 400 });
			this.ctx.storage.sql.exec(
				'DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE name = ?)',
				name
			);
			this.ctx.storage.sql.exec('DELETE FROM messages WHERE name = ?', name);
			this.broadcast({ type: 'purged', name });
			return Response.json({ ok: true, deleted: 1 });
		}

		return new Response('Not found', { status: 404 });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		let data: { type?: string; content?: unknown; id?: unknown; emoji?: unknown };
		try {
			data = JSON.parse(String(message));
		} catch {
			return;
		}

		const meta =
			(ws.deserializeAttachment() as ConnectionMeta | null) ?? { name: 'Listener', uid: null, pid: null, lastTs: 0 };

		if (data.type === 'react') {
			this.handleReaction(ws, meta, data);
			return;
		}
		if (data.type !== 'message') return;

		const content = String(data.content ?? '')
			.trim()
			.slice(0, MAX_CONTENT_LENGTH);
		if (!content) return;
		const now = Date.now();
		if (now - meta.lastTs < RATE_LIMIT_MS) {
			ws.send(JSON.stringify({ type: 'error', message: 'Slow down a little.' }));
			return;
		}
		ws.serializeAttachment({ ...meta, lastTs: now });

		const chatMessage = this.insert(meta.name, content, meta.uid);
		this.broadcast({ type: 'message', message: chatMessage });
	}

	async webSocketClose(_ws: WebSocket) {
		// Hibernation API: the connection is removed automatically on close.
	}

	/** Toggle a reaction (heart) on a message; broadcasts the new count. */
	private handleReaction(ws: WebSocket, meta: ConnectionMeta, data: { id?: unknown; emoji?: unknown }) {
		const id = String(data.id ?? '').slice(0, 64);
		const emoji = String(data.emoji ?? 'heart').slice(0, 16);
		if (!id || !/^[\w-]{1,64}$/.test(id)) return;
		const key = meta.uid ?? meta.pid;
		if (!key) return;

		const existing = this.ctx.storage.sql
			.exec('SELECT 1 FROM reactions WHERE message_id = ? AND user_key = ? AND emoji = ?', id, key, emoji)
			.toArray();
		if (existing.length > 0) {
			this.ctx.storage.sql.exec(
				'DELETE FROM reactions WHERE message_id = ? AND user_key = ? AND emoji = ?',
				id,
				key,
				emoji
			);
		} else {
			this.ctx.storage.sql.exec(
				'INSERT INTO reactions (message_id, user_key, emoji, created_at) VALUES (?, ?, ?, ?)',
				id,
				key,
				emoji,
				Date.now()
			);
		}
		const count = Number(
			this.ctx.storage.sql
				.exec('SELECT count(*) AS c FROM reactions WHERE message_id = ? AND emoji = ?', id, emoji)
				.one().c
		);
		this.broadcast({ type: 'reacted', id, emoji, count });
	}

	private insert(name: string, content: string, userId: string | null): ChatMessage {
		const msg: ChatMessage = { id: crypto.randomUUID(), ts: Date.now(), name, content, userId };
		this.ctx.storage.sql.exec(
			'INSERT INTO messages (id, ts, name, content, user_id) VALUES (?, ?, ?, ?, ?)',
			msg.id,
			msg.ts,
			msg.name,
			msg.content,
			msg.userId
		);
		// Keep stored history bounded; delete oldest beyond the cap.
		this.ctx.storage.sql.exec(
			`DELETE FROM messages WHERE id IN (
				SELECT id FROM messages ORDER BY ts DESC LIMIT -1 OFFSET ?
			)`,
			MAX_STORED
		);
		return msg;
	}

	private recent(limit: number, userKey: string | null): ChatMessage[] {
		const messages = this.ctx.storage.sql
			.exec<Record<string, string | number>>(
				'SELECT id, ts, name, content, user_id FROM messages ORDER BY ts DESC LIMIT ?',
				limit
			)
			.toArray()
			.map((row) => ({
				id: String(row.id),
				ts: Number(row.ts),
				name: String(row.name),
				content: String(row.content),
				userId: row.user_id === undefined || row.user_id === null ? null : String(row.user_id)
			}))
			.reverse();

		const ids = messages.map((m) => m.id);
		const counts: Record<string, Record<string, number>> = {};
		const mine: Record<string, string[]> = {};
		if (ids.length > 0) {
			const placeholders = ids.map(() => '?').join(',');
			const rows = this.ctx.storage.sql
				.exec<Record<string, number | string | null>>(
					`SELECT message_id, emoji, count(*) AS c,
					        SUM(CASE WHEN user_key = ? THEN 1 ELSE 0 END) AS m
					 FROM reactions
					 WHERE message_id IN (${placeholders})
					 GROUP BY message_id, emoji`,
					userKey,
					...ids
				)
				.toArray();
			for (const row of rows) {
				const mid = String(row.message_id);
				const emoji = String(row.emoji);
				(counts[mid] ??= {})[emoji] = Number(row.c);
				if (Number(row.m) > 0) (mine[mid] ??= []).push(emoji);
			}
		}
		return messages.map((m) => ({
			...m,
			reactions: counts[m.id] ?? {},
			...(mine[m.id] ? { my: mine[m.id] } : {})
		}));
	}

	/**
	 * Verify an app-issued chat identity token: `payload.sig` with
	 * payload = base64url(JSON{uid,name,exp}). HMAC-SHA256 over the payload
	 * using the shared CHAT_IDENTITY_SECRET.
	 */
	private async verifyIdentity(token: string): Promise<IdentityPayload | null> {
		const secret = this.env.CHAT_IDENTITY_SECRET;
		if (!secret) return null;
		const dot = token.lastIndexOf('.');
		if (dot <= 0) return null;
		const payload = token.slice(0, dot);
		const sig = token.slice(dot + 1);
		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
		const macHex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
		if (macHex.length !== sig.length) return null;
		let same = 0;
		for (let i = 0; i < macHex.length; i++) same |= macHex.charCodeAt(i) ^ sig.charCodeAt(i);
		if (same !== 0) return null;
		try {
			const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as IdentityPayload;
			if (
				typeof data?.uid !== 'string' ||
				typeof data?.name !== 'string' ||
				typeof data?.exp !== 'number'
			)
				return null;
			if (data.exp * 1000 < Date.now()) return null;
			return data;
		} catch {
			return null;
		}
	}

	private broadcast(payload: unknown) {
		const data = JSON.stringify(payload);
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.send(data);
			} catch {
				// Connection already closed; ignore.
			}
		}
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Route all requests (WS upgrades + HTTP) to the named room's DO.
		const url = new URL(request.url);
		const room = url.searchParams.get('room') || 'main';
		return env.CHAT_ROOM.getByName(room).fetch(request);
	}
};

/**
 * Verify a Turnstile token server-side. Fails closed.
 */
async function verifyTurnstile(
	token: string | null,
	secret: string,
	hostnames: string | undefined,
	remoteip: string | null
): Promise<boolean> {
	if (!token || token.length === 0 || token.length > 2048) return false;
	const expected = new Set((hostnames ?? '').split(',').map((h) => h.trim()).filter(Boolean));
	if (expected.size === 0) return false;
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({
				secret,
				response: token,
				...(remoteip ? { remoteip } : {})
			})
		});
		if (!res.ok) return false;
		const result = (await res.json()) as { success?: boolean; hostname?: string };
		return result.success === true && expected.has(result.hostname ?? '');
	} catch {
		return false;
	}
}
