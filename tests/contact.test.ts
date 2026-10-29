import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { createContactHandler } from '../api/contact.js';
import { checkContactLimit } from '../src/lib/server/contact-rate-limit.js';
import { contactLimits, emailDraft, submitContact, validateContact } from '../src/lib/contact.js';

const valid = { name: 'A Visitor', email: 'visitor@example.com', message: 'A project enquiry', website: '' };
const env = {
	RESEND_API_KEY: 'test-only', RESEND_TO: 'owner@example.com', RESEND_FROM: 'form@example.com',
	UPSTASH_REDIS_REST_URL: 'https://test.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test-only'
};
const requests: { url: string; init?: RequestInit }[] = [];
const success: typeof fetch = async (input, init) => {
	requests.push({ url: String(input), init });
	return String(input).includes('upstash') ? Response.json({ result: [1, 0] })
		: Response.json({ id: 'test-id' });
};
const hanging: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
	const timer = setTimeout(() => reject(new Error('Transport did not abort')), 1000);
	init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); }, { once: true });
});
type HandlerOptions = NonNullable<Parameters<typeof createContactHandler>[0]>;
async function invoke(body: unknown, options: HandlerOptions = {}, headers: Record<string, string> = {}, raw = false, method = 'POST') {
	const req = new IncomingMessage(new Socket()) as IncomingMessage & { body?: unknown };
	Object.defineProperty(req.socket, 'remoteAddress', { value: '127.0.0.1' });
	req.method = method;
	req.headers = { host: 'localhost:5173', 'content-type': 'application/json', ...headers };
	if (raw) { req.push(body); req.push(null); } else req.body = body;
	const res = new ServerResponse(req);
	let output = '';
	res.end = ((chunk: unknown) => { output = String(chunk); return res; }) as typeof res.end;
	await createContactHandler({ env, transport: success, log: () => {}, ...options })(req, res);
	return { status: res.statusCode, body: JSON.parse(output), headers: res.getHeaders() };
}

test('shared validation identifies empty, whitespace, malformed and overlong fields', () => {
	for (const body of [{}, { name: ' ', email: '\t', message: '\n' }, null, []]) {
		assert.deepEqual(Object.keys(validateContact(body).errors), ['name', 'email', 'message']);
	}
	assert(validateContact({ ...valid, email: 'bad@address' }).errors.email);
	for (const field of ['name', 'email', 'message'] as const) {
		assert(validateContact({ ...valid, [field]: 'x'.repeat(contactLimits[field] + 1) }).errors[field]);
	}
	assert.deepEqual(validateContact({ ...valid, name: ' A Visitor ' }).errors, {});
});

test('invalid requests and honeypots never touch email or Redis, even without config', async () => {
	const transport: typeof fetch = async () => { throw new Error('Unexpected external request'); };
	assert.equal((await invoke('{bad', { env: {}, transport }, {}, true)).status, 400);
	const empty = await invoke({}, { env: {}, transport });
	assert.equal(empty.status, 400);
	assert.deepEqual(Object.keys(empty.body.fields), ['name', 'email', 'message']);
	assert.equal((await invoke({ ...valid, email: 'invalid' }, { transport })).status, 400);
	assert.deepEqual((await invoke({ website: 'spam' }, { env: {}, transport })).body, { ok: true });
});

test('Vercel parsed body, JSON string, Buffer and raw Node stream all parse promptly', async () => {
	for (const body of [valid, JSON.stringify(valid), Buffer.from(JSON.stringify(valid))]) {
		assert.equal((await invoke(body)).status, 200);
	}
	assert.equal((await invoke(JSON.stringify(valid), {}, {}, true)).status, 200);
});

test('body limits count UTF-8 bytes and content length; unsupported media type is rejected', async () => {
	assert.equal((await invoke('x'.repeat(24_001), {}, {}, true)).status, 413);
	assert.equal((await invoke({ ...valid, message: 'あ'.repeat(9000) })).status, 413);
	assert.equal((await invoke({}, {}, { 'content-length': '24001' })).status, 413);
	assert.equal((await invoke(valid, {}, { 'content-type': 'text/plain' })).status, 415);
	assert.equal((await invoke(valid, {}, { 'content-type': 'application/jsonp' })).status, 415);
});

test('method and exact-origin checks reject unrelated sites', async () => {
	assert.equal((await invoke(valid, {}, {}, false, 'GET')).status, 405);
	for (const origin of ['https://evil.example', 'https://localhost:5173.evil.example', 'null']) {
		assert.equal((await invoke(valid, {}, { origin })).status, 403);
	}
	assert.equal((await invoke(valid, {}, { origin: 'http://localhost:5173' })).status, 200);
	assert.equal((await invoke(valid, { env: { ...env, ALLOWED_ORIGIN: 'https://portfolio.example' } }, { origin: 'https://portfolio.example' })).status, 200);
});

test('configuration and trusted client IP failures disable sending', async () => {
	assert.equal((await invoke(valid, { env: {} })).status, 503);
	for (const name of ['RESEND_API_KEY', 'RESEND_TO', 'RESEND_FROM']) {
		let calls = 0;
		assert.equal((await invoke(valid, { env: { ...env, [name]: '' }, transport: async () => {
			calls++;
			throw new Error('Missing provider config must not contact Redis or Resend');
		} })).status, 503);
		assert.equal(calls, 0);
	}
	assert.equal((await invoke(valid, { env: { ...env, UPSTASH_REDIS_REST_TOKEN: '' } })).status, 503);
	assert.equal((await invoke(valid, { env: { ...env, VERCEL: '1' } }, { 'x-forwarded-for': '1.2.3.4' })).status, 503);
	assert.equal((await invoke(valid, { env: { ...env, VERCEL: '1' } }, { 'x-vercel-forwarded-for': '1.2.3.4' })).status, 200);
});

test('every handler instance consults shared throttling and returns Retry-After', async () => {
	let calls = 0;
	const transport: typeof fetch = async () => { calls++; return Response.json({ result: [0, 42] }); };
	for (let instance = 0; instance < 2; instance++) {
		const result = await invoke(valid, { transport });
		assert.equal(result.status, 429);
		assert.equal(result.headers['retry-after'], 42);
	}
	assert.equal(calls, 2);
});

test('shared quota hashes identifiers and uses the same global key for different visitors', async () => {
	const commands: string[][] = [];
	const transport: typeof fetch = async (_url, init) => {
		commands.push(JSON.parse(String(init?.body)));
		return Response.json({ result: [1, 0] });
	};
	await checkContactLimit('1.2.3.4', env, transport);
	await checkContactLimit('5.6.7.8', env, transport);
	await checkContactLimit('1.2.3.4', { ...env, RESEND_TO: 'other@example.com' }, transport);
	assert.equal(commands[0][0], 'EVAL');
	assert.equal(commands[0][4], commands[1][4]);
	assert.notEqual(commands[0][3], commands[1][3]);
	assert.notEqual(commands[0][4], commands[2][4]);
	assert(!commands[0].slice(3).join('').includes('1.2.3.4'));
	assert(!commands[0].slice(3).join('').includes(env.RESEND_TO));
});

test('limiter rejection, malformed result and timeout fail closed', async () => {
	for (const response of [new Response(null, { status: 500 }), Response.json({ result: null }), Response.json({ error: 'private' })]) {
		assert.equal((await invoke(valid, { transport: async () => response })).status, 503);
	}
	await assert.rejects(checkContactLimit('1.2.3.4', env, hanging, 5));
});

test('Resend receives the verified sender, recipient, visitor reply-to and plain text', async () => {
	requests.length = 0;
	const logs: unknown[] = [];
	assert.equal((await invoke({ ...valid, message: '<script>private</script>' }, { log: (...args) => logs.push(args) })).status, 200);
	const provider = requests.find((request) => request.url === 'https://api.resend.com/emails');
	assert(provider);
	assert.equal(new Headers(provider.init?.headers).get('authorization'), `Bearer ${env.RESEND_API_KEY}`);
	const sent = JSON.parse(String(provider.init?.body));
	assert.equal(sent.from, `Personal site contact form <${env.RESEND_FROM}>`);
	assert.deepEqual(sent.to, [env.RESEND_TO]);
	assert.equal(sent.subject, `Contact form — ${valid.name}`);
	assert.equal(sent.text, '<script>private</script>');
	assert.equal(sent.reply_to, valid.email);
	assert.equal(sent.html, undefined);
	assert.deepEqual(logs, [['accepted']]);
	requests.length = 0;
	await invoke(valid, { env: { ...env, RESEND_FROM_NAME: 'Portfolio' } });
	assert.equal(JSON.parse(String(requests.find((request) => request.url.includes('api.resend.com'))?.init?.body)).from,
		`Portfolio <${env.RESEND_FROM}>`);
});

test('provider rejection, malformed acknowledgement and timeout retain failure', async () => {
	for (const response of [
		Response.json({ name: 'validation_error' }, { status: 422 }),
		new Response('Not JSON', { status: 200 }), Response.json({}),
		Response.json({ id: '' }), Response.json({ id: ' ' }), Response.json({ id: 42 }),
		Response.json(null), Response.json([{ id: 'id' }]),
		Response.json({ id: 'id' }, { status: 202 }),
		Response.json({ id: 'id' }, { status: 500 })
	]) {
		const transport: typeof fetch = async (url) => String(url).includes('upstash') ? Response.json({ result: [1, 0] }) : response;
		assert.equal((await invoke(valid, { transport })).status, 502);
	}
	const transport: typeof fetch = async (url, init) => String(url).includes('upstash') ? Response.json({ result: [1, 0] }) : hanging(url, init);
	assert.equal((await invoke(valid, { transport, providerTimeoutMs: 5 })).status, 502);
});

test('Resend quota and rate limits preserve drafts and only forward a valid retry delay', async () => {
	for (const code of ['daily_quota_exceeded', 'monthly_quota_exceeded', 'rate_limit_exceeded']) {
		for (const retry of ['60', 'invalid', '-10']) {
			const logs: unknown[] = [];
			const transport: typeof fetch = async (url) => String(url).includes('upstash')
				? Response.json({ result: [1, 0] })
				: Response.json({ name: code, message: valid.email }, { status: 429, headers: { 'Retry-After': retry } });
			const result = await invoke(valid, { transport, log: (...args) => logs.push(args) });
			assert.equal(result.status, 429);
			assert.equal(result.headers['retry-after'], retry === '60' ? 60 : undefined);
			assert.deepEqual(logs, [['provider_throttled', 429, code]]);
		}
	}
});

test('provider authorization failures report unavailable and log only a safe provider code', async () => {
	for (const status of [401, 403]) {
		for (const [body, code] of [
			[{ name: 'validation_error', message: 'The domain is not verified.' }, 'validation_error'],
			[{ name: 'restricted_api_key', message: `Private ${valid.email} ${env.RESEND_API_KEY}` }, 'restricted_api_key'],
			[{ name: 'suspended_api_key', message: '<script>private</script>' }, 'suspended_api_key'],
			[{ name: env.RESEND_API_KEY, message: valid.message }, undefined],
			[null, undefined]
		]) {
			const logs: unknown[] = [];
			const transport: typeof fetch = async (url) => String(url).includes('upstash')
				? Response.json({ result: [1, 0] }) : Response.json(body, { status });
			const result = await invoke(valid, { transport, log: (...args) => logs.push(args) });
			assert.equal(result.status, 503);
			assert.deepEqual(result.body, { error: 'The contact service is unavailable. Please email directly.' });
			assert.deepEqual(logs, [['provider_authorization_failed', status, code]]);
		}
	}
	const result = await submitContact(valid, async () => Response.json({}, { status: 503 }));
	assert.equal(result.ok, false);
	assert.match(result.message, /service is unavailable/);
});

test('client transport distinguishes failure statuses without mutating the draft', async () => {
	for (const status of [400, 403, 404, 405, 429, 502, 503]) {
		const draft = { ...valid };
		const result = await submitContact(draft, async () => Response.json({ fields: { email: 'Check email' } }, { status, headers: { 'Retry-After': '60' } }));
		assert.equal(result.ok, false);
		assert.deepEqual(draft, valid);
		if (status === 400 && !result.ok) assert.equal(result.errors?.email, 'Check email');
		if (status === 429) assert.match(result.message, /1 minute/);
		if (status === 404) assert.match(result.message, /unavailable/);
	}
	for (const data of [{}, { error: 'Thanks' }, { ok: 'true' }]) {
		assert.equal((await submitContact(valid, async () => Response.json(data))).ok, false);
	}
	assert.equal((await submitContact(valid, async () => new Response('HTML'))).ok, false);
	assert.equal((await submitContact(valid, async () => Response.json({ ok: true }))).ok, true);
});

test('rejected client requests and timeouts return actionable feedback', async () => {
	assert.match((await submitContact(valid, async () => { throw new Error('offline'); })).message, /could not be reached/);
	assert.match((await submitContact(valid, hanging, 5)).message, /timed out/);
});

test('email fallback encodes the visitor draft, including special characters', () => {
	const url = new URL(emailDraft('owner@example.com', { ...valid, message: 'Hello & thanks?\n日本語' }));
	assert.equal(url.protocol, 'mailto:');
	assert.match(url.searchParams.get('body')!, /Hello & thanks\?\n日本語/);
	assert.match(url.searchParams.get('body')!, /visitor@example.com/);
	assert.match(url.searchParams.get('subject')!, /A Visitor/);
});
