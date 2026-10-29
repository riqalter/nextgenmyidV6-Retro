import { BodyError, MAX_BODY, createContactService, type ContactDependencies } from '../../src/lib/server/contact-service.js';

/** Bound the stream before buffering it; cancel stalled or oversized requests. */
async function readBody(request: Request, timeoutMs: number): Promise<unknown> {
	if (Number(request.headers.get('content-length')) > MAX_BODY) throw new BodyError(413);
	if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new BodyError(415);
	const reader = request.body?.getReader();
	if (!reader) throw new BodyError(400);
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const timeout = new Promise<never>((_resolve, reject) => {
			timer = setTimeout(() => reject(new BodyError(408)), timeoutMs);
		});
		const chunks: Uint8Array[] = [];
		let bytes = 0;
		while (true) {
			const { done, value } = await Promise.race([reader.read(), timeout]);
			if (done) break;
			bytes += value.byteLength;
			if (bytes > MAX_BODY) throw new BodyError(413);
			chunks.push(value);
		}
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} finally {
		clearTimeout(timer);
		void reader.cancel().catch(() => {});
	}
}

export function createNetlifyContactHandler(options: ContactDependencies = {}) {
	const handle = createContactService(options);
	return async (request: Request, context: { ip?: string }): Promise<Response> => {
		const url = new URL(request.url);
		const result = await handle({
			method: request.method, origin: request.headers.get('origin'), host: url.host,
			allowHttp: url.protocol === 'http:',
			// Netlify supplies context.ip. Forwarded headers are visitor-controlled.
			ip: context.ip, readBody: () => readBody(request, options.bodyTimeoutMs ?? 2000)
		});
		const headers = Object.fromEntries(Object.entries(result.headers).map(([name, value]) => [name, String(value)]));
		return Response.json(result.body, { status: result.status, headers });
	};
}

export default createNetlifyContactHandler();
export const config = { path: '/api/contact' };
