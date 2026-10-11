/**
 * Contact form → MailerSend.
 *
 * Why this is a function and not a fetch from the browser: the site is a static
 * build, and a fetch from client-side JavaScript would put the MailerSend API
 * token in the shipped bundle, where anyone could read it and send mail as you.
 * The token lives in Vercel's environment instead and never leaves the server.
 *
 * Setup (Vercel dashboard → Project → Settings → Environment Variables):
 *   MAILERSEND_API_TOKEN   required — MailerSend → Settings → API tokens
 *   MAILERSEND_TO          required — where the message should land
 *   MAILERSEND_FROM        optional — must be a verified sender in MailerSend
 *   MAILERSEND_FROM_NAME   optional — display name, defaults to the site name
 *   ALLOWED_ORIGIN         optional — defaults to the Vercel URL of this deploy
 *
 * All five are server-only. Nothing here is prefixed PUBLIC_, so Vercel will
 * not inline any of them into the client bundle.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

const API = 'https://api.mailersend.com/v1/email';

/** MailerSend's documented per-request ceiling is 50 KB; stay well under. */
const MAX_BODY = 20_000;

const LIMITS = { name: 120, email: 254, message: 5000 } as const;

/**
 * Per-instance rate limit. A serverless instance is short-lived and not shared,
 * so this is a speed bump against a single spam script, not a quota — real
 * protection is the honeypot plus MailerSend's own rate limiting behind us.
 */
const HITS = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
	const now = Date.now();
	const hit = HITS.get(ip);

	if (!hit || hit.until < now) {
		HITS.set(ip, { count: 1, until: now + WINDOW_MS });
		return false;
	}

	hit.count += 1;
	return hit.count > MAX_PER_WINDOW;
}

function clientIp(req: IncomingMessage): string {
	const fwd = req.headers['x-forwarded-for'];
	return (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || 'unknown';
}

/** Only the site's own pages may post. Stops drive-by use of your quota. */
function originAllowed(req: IncomingMessage): boolean {
	const origin = req.headers.origin;
	if (!origin) return true; // same-origin form posts and curl send no Origin

	const allowed = process.env.ALLOWED_ORIGIN;
	if (allowed) return origin === allowed;

	// Fall back to "same host", which is right for a Vercel deploy where the
	// function and the static site share a hostname.
	const host = req.headers.host;
	return Boolean(host) && origin.endsWith(`//${host}`);
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let raw = '';
		req.on('data', (chunk) => {
			raw += chunk;
			if (raw.length > MAX_BODY) {
				reject(new Error('body too large'));
				req.destroy();
			}
		});
		req.on('end', () => resolve(raw));
		req.on('error', reject);
	});
}

/**
 * Deliberately permissive: the goal is to catch typos, not to police RFC 5322.
 * MailerSend rejects anything genuinely undeliverable on its own.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(input: unknown): Record<string, string> | null {
	if (typeof input !== 'object' || input === null) return null;
	const body = input as Record<string, unknown>;

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim() : '';
	const message = typeof body.message === 'string' ? body.message.trim() : '';

	if (!name || !email || !message) return null;
	if (name.length > LIMITS.name) return null;
	if (email.length > LIMITS.email || !EMAIL.test(email)) return null;
	if (message.length > LIMITS.message) return null;

	return { name, email, message };
}

/**
 * Test-only hook: clears the per-instance rate-limit state.
 *
 * Vercel builds one module per instance and this Map is module state, so in
 * production there is nothing to reset — this exists so the branches above can
 * be exercised without one test starving the next.
 */
export function __resetRateLimit(): void {
	HITS.clear();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
	// Every failure below returns the same shape: a status, a short sentence,
	// and never anything that reveals the token, the sender, or the provider.
	const fail = (status: number, message: string) => {
		res.statusCode = status;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({ error: message }));
	};

	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST');
		return fail(405, 'Method not allowed.');
	}

	if (!originAllowed(req)) return fail(403, 'Not allowed.');

	if (rateLimited(clientIp(req))) {
		return fail(429, 'Too many messages. Try again in a minute.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(await readBody(req));
	} catch {
		return fail(400, 'Could not read that message.');
	}

	// Honeypot, checked before anything that could leak state: a real visitor
	// never fills a field they cannot see. Answer 200 either way, so a bot
	// learns nothing from the response — not even whether the form is set up.
	if (typeof parsed === 'object' && parsed !== null && (parsed as { website?: string }).website) {
		return fail(200, 'Thanks.');
	}

	// A hung upstream must not hold the invocation open until Vercel kills it.
	const upstream = AbortSignal.timeout(8000);

	const token = process.env.MAILERSEND_API_TOKEN;
	const to = process.env.MAILERSEND_TO;
	const from = process.env.MAILERSEND_FROM || to;

	if (!token || !to || !from) {
		console.error('contact: MAILERSEND_API_TOKEN / MAILERSEND_TO / MAILERSEND_FROM missing');
		return fail(500, 'The form is not configured yet.');
	}

	const fields = validate(parsed);
	if (!fields) return fail(400, 'Please check every field and try again.');

	const { name, email, message } = fields;
	const fromName = process.env.MAILERSEND_FROM_NAME || 'Personal site contact form';

	try {
		const res_ = await fetch(API, {
			method: 'POST',
			signal: upstream,
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: JSON.stringify({
				from: { email: from, name: fromName },
				to: [{ email: to }],
				// Reply-To is the visitor, not you: hitting reply in your inbox
				// goes straight back to them.
				reply_to: { email, name },
				subject: `Contact form — ${name}`,
				// Plain text on purpose. There is no HTML part, so a name or a
				// message containing markup cannot become live HTML in your
				// inbox — nothing to escape, nothing to sanitise later.
				text: message
			})
		});

		if (!res_.ok) {
			// Log the detail, return none of it.
			console.error('contact: MailerSend', res_.status, (await res_.text()).slice(0, 500));
			return fail(502, 'Could not send that. Please email me directly.');
		}
	} catch (e) {
		console.error('contact: MailerSend unreachable', e);
		return fail(502, 'Could not send that. Please email me directly.');
	}

	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify({ ok: true }));
}