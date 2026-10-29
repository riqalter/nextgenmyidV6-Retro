import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { createNetlifyContactHandler } from '../netlify/functions/contact.js';

const valid = { name: 'A Visitor', email: 'visitor@example.com', message: 'A project enquiry', website: '' };
const env = {
	RESEND_API_KEY: 'test-token', RESEND_TO: 'owner@example.com', RESEND_FROM: 'form@example.com',
	UPSTASH_REDIS_REST_URL: 'https://test.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test-redis-token'
};
type Options = NonNullable<Parameters<typeof createNetlifyContactHandler>[0]>;
const noRequests: typeof fetch = async () => { throw new Error('Unexpected external request'); };
const success: typeof fetch = async (url) => String(url).includes('upstash') ? Response.json({ result: [1, 0] })
	: Response.json({ id: 'test-id' });

function request(body = JSON.stringify(valid), init: RequestInit = {}, url = 'https://preview.netlify.app/api/contact') {
	return new Request(url, { method: 'POST', body, ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
}
function invoke(req: Request, options: Options = {}, ip: string | undefined = '203.0.113.1') {
	return createNetlifyContactHandler({ env, transport: success, log: () => {}, ...options })(req, { ip });
}

test('Netlify entry point returns field errors before configuration or service access', async () => {
	const response = await handler(request('{}'), { ip: '203.0.113.1' });
	assert.equal(response.status, 400);
	assert.deepEqual(Object.keys((await response.json()).fields), ['name', 'email', 'message']);
	assert.match(response.headers.get('content-type')!, /application\/json/);
	assert.equal(response.headers.get('cache-control'), 'no-store');
	assert.equal((await invoke(request('{bad'), { env: {}, transport: noRequests })).status, 400);
	const honeypot = await invoke(request('{"website":"spam"}'), { env: {}, transport: noRequests });
	assert.deepEqual(await honeypot.json(), { ok: true });
});

test('Netlify checks methods and exact origins on production, previews and local dev', async () => {
	const method = await invoke(request('', { method: 'PUT' }), { transport: noRequests });
	assert.equal(method.status, 405);
	assert.equal(method.headers.get('allow'), 'POST');
	for (const origin of ['https://evil.example', 'https://preview.netlify.app.evil.example', 'http://preview.netlify.app', 'null']) {
		assert.equal((await invoke(request(undefined, { headers: { origin } }), { transport: noRequests })).status, 403);
	}
	assert.equal((await invoke(request(undefined, { headers: { origin: 'https://preview.netlify.app' } }))).status, 200);
	assert.equal((await invoke(request(undefined, { headers: { origin: 'http://localhost:8888' } }, 'http://localhost:8888/api/contact'))).status, 200);
	assert.equal((await invoke(request(undefined, { headers: { origin: 'https://portfolio.example' } }), {
		env: { ...env, ALLOWED_ORIGIN: 'https://portfolio.example' }
	})).status, 200);
});

test('Netlify bounds streamed UTF-8 bodies, content length and media types', async () => {
	for (const body of ['x'.repeat(24_001), JSON.stringify({ ...valid, message: 'あ'.repeat(9000) })]) {
		assert.equal((await invoke(request(body), { transport: noRequests })).status, 413);
	}
	assert.equal((await invoke(request('{}', { headers: { 'content-length': '24001' } }), { transport: noRequests })).status, 413);
	for (const contentType of ['text/plain', 'application/jsonp']) {
		assert.equal((await invoke(request(undefined, { headers: { 'Content-Type': contentType } }), { transport: noRequests })).status, 415);
	}
	assert.equal((await invoke(new Request('https://preview.netlify.app/api/contact', {
		method: 'POST', headers: { 'Content-Type': 'application/json' }
	}), { transport: noRequests })).status, 400);
});

test('Netlify cancels a stalled body within the configured timeout', async () => {
	let cancelled = false;
	const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
	const req = new Request('https://preview.netlify.app/api/contact', {
		method: 'POST', headers: { 'Content-Type': 'application/json' }, body, duplex: 'half'
	} as RequestInit);
	assert.equal((await invoke(req, { transport: noRequests, bodyTimeoutMs: 5 })).status, 408);
	assert.equal(cancelled, true);
});

test('Netlify accepts chunked JSON with a multibyte character across chunks', async () => {
	const bytes = new TextEncoder().encode(JSON.stringify({ ...valid, message: 'こんにちは' }));
	const split = bytes.indexOf(0xe3) + 1;
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(bytes.slice(0, split));
			controller.enqueue(bytes.slice(split));
			controller.close();
		}
	});
	const req = new Request('https://preview.netlify.app/api/contact', {
		method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body, duplex: 'half'
	} as RequestInit);
	assert.deepEqual(await (await invoke(req)).json(), { ok: true });
});

test('Netlify uses only context.ip for the shared limiter, ignoring spoofed forwarding headers', async () => {
	const keys: string[] = [];
	const transport: typeof fetch = async (url, init) => {
		if (String(url).includes('upstash')) keys.push(JSON.parse(String(init?.body))[3]);
		return success(url, init);
	};
	for (const forwarded of ['1.2.3.4', '5.6.7.8']) {
		assert.equal((await invoke(request(undefined, { headers: {
			'x-forwarded-for': forwarded, 'x-nf-client-connection-ip': forwarded, 'x-vercel-forwarded-for': forwarded
		} }), { transport })).status, 200);
	}
	assert.equal(keys[0], keys[1]);
	assert.equal((await invoke(request(), { transport }, '2001:db8::1')).status, 200);
	assert.notEqual(keys[0], keys[2]);
	for (const ip of ['', 'not-an-ip']) {
		assert.equal((await invoke(request(), { transport: noRequests }, ip)).status, 503);
	}
	assert.equal((await createNetlifyContactHandler({ env, transport: noRequests })(request(), {})).status, 503);
});

test('Netlify preserves Retry-After, configuration failures and provider failures', async () => {
	const limited = await invoke(request(), { transport: async () => Response.json({ result: [0, 42] }) });
	assert.equal(limited.status, 429);
	assert.equal(limited.headers.get('retry-after'), '42');
	assert.equal(limited.headers.get('cache-control'), 'no-store');
	assert.equal((await invoke(request(), { env: {}, transport: noRequests })).status, 503);
	assert.equal((await invoke(request(), { env: { ...env, UPSTASH_REDIS_REST_TOKEN: '' }, transport: noRequests })).status, 503);
	const rejected = await invoke(request(), { transport: async (url) => String(url).includes('upstash')
		? Response.json({ result: [1, 0] }) : new Response(null, { status: 422 }) });
	assert.equal(rejected.status, 502);
	const unauthorized = await invoke(request(), { transport: async (url) => String(url).includes('upstash')
		? Response.json({ result: [1, 0] }) : Response.json({ name: 'validation_error', message: 'Domain is not verified.' }, { status: 403 }) });
	assert.equal(unauthorized.status, 503);
	assert.equal(unauthorized.headers.get('cache-control'), 'no-store');
	assert.deepEqual(await unauthorized.json(), { error: 'The contact service is unavailable. Please email directly.' });
});
