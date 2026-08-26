const URL = 'ws://localhost:8790/api/chat/ws?room=main&name=';
const msgs = [];

function connect(name) {
	const ws = new WebSocket(URL + encodeURIComponent(name));
	ws.onopen = () => console.log(`[${name}] open`);
	ws.onerror = (e) => console.log(`[${name}] error`, e.message ?? e.type);
	ws.onmessage = (e) => {
		const data = typeof e.data === 'string' ? e.data : '';
		msgs.push({ name, data });
		console.log(`[${name}] <= ${data}`);
	};
	ws.onclose = () => console.log(`[${name}] close`);
	return ws;
}

const alice = connect('Alice');
const bob = connect('Bob');

setTimeout(() => {
	console.log('--- alice sends ---');
	alice.send(JSON.stringify({ type: 'message', content: 'Hello from Alice!' }));
}, 500);

setTimeout(() => {
	console.log('--- bob sends ---');
	bob.send(JSON.stringify({ type: 'message', content: 'Hey Alice!' }));
}, 900);

setTimeout(() => {
	console.log('--- bob spams (rate limit) ---');
	bob.send(JSON.stringify({ type: 'message', content: 'x' }));
}, 1200);

setTimeout(() => {
	console.log('--- reconnecting alice to check history ---');
	alice.close();
	const alice2 = connect('Alice');
	setTimeout(() => {
		const replay = msgs.find(
			(m) => m.name === 'Alice' && m.data.includes('"type":"history"') && m.data.includes('Hello from Alice!') && m.data.includes('Hey Alice!')
		);
		if (replay) {
			console.log('PASS: history persisted and replayed');
		} else {
			console.log('FAIL: history replay missing messages');
		}
		process.exit(0);
	}, 600);
}, 1600);
