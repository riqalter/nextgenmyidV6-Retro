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
	log?: (event: string, status?: number, code?: string) => void;
}

/** Allowlisted Resend error names keep free-form provider content out of logs. */
function providerErrorCode(body: Record<string, unknown>): string | undefined {
	const codes = ['validation_error', 'missing_api_key', 'restricted_api_key', 'suspended_api_key',
		'invalid_permission', 'missing_required_field', 'missing_required_parameter',
		'daily_quota_exceeded', 'monthly_quota_exceeded', 'rate_limit_exceeded',
		'application_error', 'internal_server_error', 'service_unavailable'];
	return typeof body.name === 'string' && codes.includes(body.name) ? body.name : undefined;
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
	log = (event, status, code) => console.info(JSON.stringify({ component: 'contact', event, status, code }))
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
		const { RESEND_API_KEY: token, RESEND_TO: to, RESEND_FROM: from } = env;
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
			const response = await transport('https://api.resend.com/emails', {
				method: 'POST', signal: AbortSignal.timeout(providerTimeoutMs),
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					from: `${env.RESEND_FROM_NAME || 'Personal site contact form'} <${from}>`,
					to: [to], reply_to: fields.email,
					subject: `Contact form — ${fields.name}`, text: fields.message
				})
			});
			const payload: unknown = await response.json().catch(() => null);
			const body = payload && typeof payload === 'object' && !Array.isArray(payload)
				? payload as Record<string, unknown> : {};
			// A successful API response with an email ID confirms acceptance, not delivery.
			if (response.status !== 200 || typeof body.id !== 'string' || !body.id.trim()) {
				const code = providerErrorCode(body);
				if (response.status === 401 || response.status === 403) {
					log('provider_authorization_failed', response.status, code);
					return respond(503, { error: 'The contact service is unavailable. Please email directly.' });
				}
				if (response.status === 429) {
					log('provider_throttled', response.status, code);
					const retryAfter = Number(response.headers.get('retry-after'));
					if (Number.isFinite(retryAfter) && retryAfter > 0) headers['Retry-After'] = Math.ceil(retryAfter);
					return respond(429, { error: 'Sending limit reached. Please try later or email directly.' });
				}
				log('provider_rejected', response.status, code);
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
