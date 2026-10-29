import { isIP } from 'node:net';
import { validateContact } from '../contact.js';
import { checkContactLimit } from './contact-rate-limit.js';

export const MAX_BODY = 24_000;
export class BodyError extends Error {
	constructor(public status: number) { super('invalid_body'); }
}

interface ContactRequest {
	method?: string;
	origin?: string | null;
	host?: string;
	allowHttp: boolean;
	ip?: string | null;
	readBody: () => Promise<unknown>;
}
interface ContactResult {
	status: number;
	headers: Record<string, string | number>;
	body: object;
}
export interface ContactDependencies {
	env?: NodeJS.ProcessEnv;
	transport?: typeof fetch;
	providerTimeoutMs?: number;
	bodyTimeoutMs?: number;
	log?: (event: string, status?: number) => void;
}

function originAllowed(req: ContactRequest, env: NodeJS.ProcessEnv): boolean {
	if (!req.origin) return true; // Direct requests still pass the shared quota.
	try {
		const origin = new URL(req.origin);
		if (origin.origin !== req.origin) return false;
		return env.ALLOWED_ORIGIN ? origin.origin === env.ALLOWED_ORIGIN
			: origin.host === req.host && ['https:', ...(req.allowHttp ? ['http:'] : [])].includes(origin.protocol);
	} catch { return false; }
}

/** Both hosting adapters use the same validation, quota and email behavior. */
export function createContactService({
	env = process.env, transport = fetch, providerTimeoutMs = 6000,
	log = (event, status) => console.info(JSON.stringify({ component: 'contact', event, status }))
}: ContactDependencies = {}) {
	return async (req: ContactRequest): Promise<ContactResult> => {
		const headers: ContactResult['headers'] = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
		const respond = (status: number, body: object): ContactResult => ({ status, headers, body });
		if (req.method !== 'POST') {
			headers.Allow = 'POST';
			return respond(405, { error: 'Method not allowed.' });
		}
		if (!originAllowed(req, env)) return respond(403, { error: 'Not allowed.' });
		let parsed: unknown;
		try { parsed = await req.readBody(); }
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
		if (!req.ip || !isIP(req.ip)) return respond(503, { error: 'The contact service is unavailable.' });
		try {
			const limit = await checkContactLimit(req.ip, env, transport);
			if (!limit.allowed) {
				log('throttled'); headers['Retry-After'] = limit.retryAfter;
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
