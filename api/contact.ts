import type { IncomingMessage, ServerResponse } from 'node:http';
import { BodyError, MAX_BODY, createContactService, type ContactDependencies } from '../src/lib/server/contact-service.js';

type ContactRequest = IncomingMessage & { body?: unknown };

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

function clientIp(req: ContactRequest, env: NodeJS.ProcessEnv): string | null {
	// Vercel overwrites this header at its edge. Never trust forwarded IPs locally.
	const header = req.headers['x-vercel-forwarded-for'];
	return (env.VERCEL ? (Array.isArray(header) ? header[0] : header)?.split(',')[0].trim() : req.socket.remoteAddress) || null;
}

/** Dependency injection keeps tests offline, without real credentials or emails. */
export function createContactHandler(options: ContactDependencies = {}) {
	const { env = process.env, bodyTimeoutMs = 2000 } = options;
	const handle = createContactService(options);
	return async (req: ContactRequest, res: ServerResponse) => {
		const result = await handle({
			method: req.method, origin: req.headers.origin, host: req.headers.host,
			allowHttp: !env.VERCEL, ip: clientIp(req, env), readBody: () => readBody(req, bodyTimeoutMs)
		});
		res.statusCode = result.status;
		for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
		res.end(JSON.stringify(result.body));
	};
}

export default createContactHandler();
