/** Shared by the browser and the email function. */
export const contactLimits = { name: 120, email: 254, message: 5000 } as const;
export type ContactField = keyof typeof contactLimits;
export type ContactFields = Record<ContactField, string>;
export type FieldErrors = Partial<ContactFields>;
export const contactFieldNames = Object.keys(contactLimits) as ContactField[];

export function validateContact(input: unknown): { fields: ContactFields; errors: FieldErrors } {
	const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
	const fields = { name: '', email: '', message: '' };
	const errors: FieldErrors = {};
	for (const key of contactFieldNames) {
		fields[key] = typeof body[key] === 'string' ? body[key].trim() : '';
		if (!fields[key]) errors[key] = `Enter your ${key}.`;
		else if (fields[key].length > contactLimits[key]) errors[key] = `Use ${contactLimits[key]} characters or fewer.`;
	}
	if (fields.email && !errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) {
		errors.email = 'Enter a valid email address, such as you@example.com.';
	}
	return { fields, errors };
}

export function emailDraft(to: string, fields: ContactFields): string {
	const subject = encodeURIComponent(`Portfolio enquiry from ${fields.name.trim()}`);
	const body = encodeURIComponent(`${fields.message.trim()}\n\n— ${fields.name.trim()} (${fields.email.trim()})`);
	return `mailto:${to}?subject=${subject}&body=${body}`;
}

export type ContactResult =
	| { ok: true; message: string }
	| { ok: false; message: string; errors?: FieldErrors };

/** A failure leaves the caller's draft intact. Opening another app is a visitor action. */
export async function submitContact(
	fields: ContactFields & { website: string }, transport: typeof fetch = fetch, timeoutMs = 12_000
): Promise<ContactResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await transport('/api/contact', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(fields), signal: controller.signal
		});
		const data: unknown = await response.json().catch(() => null);
		const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
		if (response.ok && payload.ok === true) {
			return { ok: true, message: 'Message accepted for sending. Thanks for getting in touch.' };
		}
		if (response.status === 400) {
			const errors: FieldErrors = {};
			if (payload.fields && typeof payload.fields === 'object') {
				for (const key of contactFieldNames) {
					const error = (payload.fields as Record<string, unknown>)[key];
					if (typeof error === 'string') errors[key] = error;
				}
			}
			return { ok: false, message: 'Please check your details and try again.', errors };
		}
		if (response.status === 429) {
			const seconds = Number(response.headers.get('Retry-After'));
			const minutes = Math.ceil(seconds / 60);
			const retry = Number.isFinite(seconds) && seconds > 0
				? `Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, or use your email app.`
				: 'Try again later, or use your email app.';
			return { ok: false, message: `The form has reached its sending limit. ${retry}` };
		}
		if ([404, 405, 501, 503].includes(response.status)) {
			return { ok: false, message: 'The contact service is unavailable. You can send this draft with your email app.' };
		}
		if (response.status === 413) return { ok: false, message: 'This message is too large. Shorten it or use your email app.' };
		if (response.status === 403) return { ok: false, message: 'The form could not accept this request. Use your email app to send this draft.' };
		return { ok: false, message: 'Sending could not be confirmed. Your draft is still here; you can send it with your email app.' };
	} catch {
		return { ok: false, message: controller.signal.aborted
			? 'The request timed out. Sending could not be confirmed. Your draft is still here.'
			: 'The contact service could not be reached. Your draft is still here.' };
	} finally { clearTimeout(timer); }
}
