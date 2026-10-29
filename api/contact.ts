import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { validateContact } from '../src/lib/contact.js';
import { checkContactLimit } from '../src/lib/server/contact-rate-limit.js';

type ContactRequest = IncomingMessage & { body?: unknown };
const MAX_BODY = 24_000;
class BodyError extends Error {
	constructor(public status: number) { super('invalid_body'); }
}

/** Use Vercel's parsed body helper; support raw Node requests for local tooling. */
async function readBody(req: ContactRequest, timeoutMs: number): Promise<unknown> {
	if (Number(req.headers['content-length']) > MAX_BODY) throw new BodyError(413);
	if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new BodyError(415);
	const body = req.body; // The Vercel getter can throw on invalid JSON.
	if (body !== undefined) {
		const raw = typeof body === 'string' || Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body);
		if (Buffer.byteLength(raw) > MAX_BODY) throw new BodyError(413);
		return JSON.parse(raw);
	}
	const raw = await new Promise<string>((resolve, reject) => {
		const chunks: Buffer[] = [];
		let bytes = 0;
		const timer = setTimeout(() => finish(new BodyError(408)), timeoutMs);
		const cleanup = () => {
			clearTimeout(timer);
			req.off('data', onData); req.off('end', onEnd); req.off('error', onError); req.off('aborted', onAbort);
		};
		const finish = (error?: Error) => {
			cleanup();
			if (error) { req.resume(); reject(error); }
			else resolve(Buffer.concat(chunks).toString('utf8'));
		};
		const onData = (chunk: Buffer | string) => {
			const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			bytes += buffer.length;
			if (bytes > MAX_BODY) finish(new BodyError(413));
			else chunks.push(buffer);
		};
		const onEnd = () => finish();
		const onError = (error: Error) => finish(error);
		const onAbort = () => finish(new BodyError(400));
		req.on('data', onData).once('end', onEnd).once('error', onError).once('aborted', onAbort);
	});
	return JSON.parse(raw);
}

function originAllowed(req: ContactRequest, env: NodeJS.ProcessEnv): boolean {
	if (!req.headers.origin) return true; // Direct requests still pass the shared quota.
	try {
		const origin = new URL(req.headers.origin);
		if (origin.origin !== req.headers.origin) return false;
		return env.ALLOWED_ORIGIN ? origin.origin === env.ALLOWED_ORIGIN
			: origin.host === req.headers.host && ['https:', ...(env.VERCEL ? [] : ['http:'])].includes(origin.protocol);
	} catch { return false; }
}

function clientIp(req: ContactRequest, env: NodeJS.ProcessEnv): string | null {
	// Vercel overwrites this header at its edge. Never trust forwarded IPs locally.
	const header = req.headers['x-vercel-forwarded-for'];
	const ip = env.VERCEL ? (Array.isArray(header) ? header[0] : header)?.split(',')[0].trim() : req.socket.remoteAddress;
	return ip && isIP(ip) ? ip : null;
}

interface Dependencies {
	env?: NodeJS.ProcessEnv;
	transport?: typeof fetch;
	providerTimeoutMs?: number;
	bodyTimeoutMs?: number;
	log?: (event: string, status?: number) => void;
}

/** Dependency injection keeps tests offline, without real credentials or emails. */
export function createContactHandler({
	env = process.env, transport = fetch, providerTimeoutMs = 6000, bodyTimeoutMs = 2000,
	log = (event, status) => console.info(JSON.stringify({ component: 'contact', event, status }))
}: Dependencies = {}) {
	return async (req: ContactRequest, res: ServerResponse) => {
		const respond = (status: number, data: object) => {
			res.statusCode = status;
			res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
			res.end(JSON.stringify(data));
		};
		if (req.method !== 'POST') {
			res.setHeader('Allow', 'POST');
			return respond(405, { error: 'Method not allowed.' });
		}
		if (!originAllowed(req, env)) return respond(403, { error: 'Not allowed.' });
		let parsed: unknown;
		try { parsed = await readBody(req, bodyTimeoutMs); }
		catch (error) { return respond(error instanceof BodyError ? error.status : 400, { error: 'Could not read that message.' }); }
		if (parsed && typeof parsed === 'object' && (parsed as { website?: unknown }).website) {
			return respond(200, { ok: true }); // Honeypot: no provider, limiter or config lookup.
		}
		const { fields, errors } = validateContact(parsed);
		if (Object.keys(errors).length) return respond(400, { error: 'Please check your details.', fields: errors });
		const { MAILERSEND_API_TOKEN: token, MAILERSEND_TO: to, MAILERSEND_FROM: from } = env;
		if (!token || !to || !from) {
			log('configuration_missing');
			return respond(503, { error: 'The contact service is unavailable.' });
		}
		const ip = clientIp(req, env);
		if (!ip) return respond(503, { error: 'The contact service is unavailable.' });
		try {
			const limit = await checkContactLimit(ip, env, transport);
			if (!limit.allowed) {
				log('throttled'); res.setHeader('Retry-After', limit.retryAfter);
				return respond(429, { error: 'Sending limit reached. Please try later or email directly.' });
			}
		} catch {
			log('limiter_unavailable');
			return respond(503, { error: 'The contact service is unavailable.' });
		}
		try {
			const response = await transport('https://api.mailersend.com/v1/email', {
				method: 'POST', signal: AbortSignal.timeout(providerTimeoutMs),
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					from: { email: from, name: env.MAILERSEND_FROM_NAME || 'Personal site contact form' },
					to: [{ email: to }], reply_to: { email: fields.email, name: fields.name },
					subject: `Contact form — ${fields.name}`, text: fields.message
				})
			});
			// Queuing is asynchronous. Suppressed/paused requests must not clear a draft.
			if (response.status !== 202 || !response.headers.get('x-message-id') || response.headers.get('x-send-paused') === 'true') {
				log('provider_rejected', response.status);
				return respond(502, { error: 'Sending could not be confirmed. Please email directly.' });
			}
		} catch {
			log('provider_unreachable');
			return respond(502, { error: 'Sending could not be confirmed. Please email directly.' });
		}
		log('accepted');
		return respond(200, { ok: true });
	};
}

export default createContactHandler();
