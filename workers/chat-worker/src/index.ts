import { DurableObject } from 'cloudflare:workers';

export interface Env {
	CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
	TURNSTILE_SECRET?: string;
	TURNSTILE_HOSTNAMES?: string;
}

export interface ChatMessage {
	id: string;
	ts: number;
	name: string;
	content: string;
}

interface ConnectionMeta {
	name: string;
	lastTs: number;
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
			const name = (url.searchParams.get('name') || 'Listener').slice(0, MAX_NAME_LENGTH);
			const pair = new WebSocketPair();
			pair[1].serializeAttachment({ name, lastTs: 0 } satisfies ConnectionMeta);
			this.ctx.acceptWebSocket(pair[1]);
			pair[1].send(JSON.stringify({ type: 'history', messages: this.recent(HISTORY_LIMIT) }));
			return new Response(null, { status: 101, webSocket: pair[0] });
		}

		// Plain HTTP: health check or history snapshot.
		if (url.pathname === '/api/health') {
			return Response.json({ ok: true });
		}
		if (url.pathname === '/api/history') {
			return Response.json({ messages: this.recent(HISTORY_LIMIT) });
		}
		return new Response('Not found', { status: 404 });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		let data: { type?: string; content?: unknown };
		try {
			data = JSON.parse(String(message));
		} catch {
			return;
		}
		if (data.type !== 'message') return;

		const content = String(data.content ?? '')
			.trim()
			.slice(0, MAX_CONTENT_LENGTH);
		if (!content) return;

		const meta = (ws.deserializeAttachment() as ConnectionMeta | null) ?? { name: 'Listener', lastTs: 0 };
		const now = Date.now();
		if (now - meta.lastTs < RATE_LIMIT_MS) {
			ws.send(JSON.stringify({ type: 'error', message: 'Slow down a little.' }));
			return;
		}
		ws.serializeAttachment({ ...meta, lastTs: now });

		const chatMessage = this.insert(meta.name, content);
		this.broadcast({ type: 'message', message: chatMessage });
	}

	async webSocketClose(_ws: WebSocket) {
		// Hibernation API: the connection is removed automatically on close.
	}

	private insert(name: string, content: string): ChatMessage {
		const msg: ChatMessage = { id: crypto.randomUUID(), ts: Date.now(), name, content };
		this.ctx.storage.sql.exec(
			'INSERT INTO messages (id, ts, name, content) VALUES (?, ?, ?, ?)',
			msg.id,
			msg.ts,
			msg.name,
			msg.content
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

	private recent(limit: number): ChatMessage[] {
		return this.ctx.storage.sql
			.exec<Record<string, string | number>>(
				'SELECT id, ts, name, content FROM messages ORDER BY ts DESC LIMIT ?',
				limit
			)
			.toArray()
			.map((row) => ({
				id: String(row.id),
				ts: Number(row.ts),
				name: String(row.name),
				content: String(row.content)
			}))
			.reverse();
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
