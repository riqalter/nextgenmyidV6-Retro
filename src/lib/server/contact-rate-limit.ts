import { createHmac } from 'node:crypto';
type Environment = Record<string, string | undefined>;
export interface RateLimit { allowed: boolean; retryAfter: number }

/** Atomic limits shared by every function instance. Redis expires every key. */
export const limitScript = `
local ip = tonumber(redis.call('GET', KEYS[1]) or '0')
local total = tonumber(redis.call('GET', KEYS[2]) or '0')
if ip >= tonumber(ARGV[1]) then return {0, redis.call('TTL', KEYS[1])} end
if total >= tonumber(ARGV[2]) then return {0, redis.call('TTL', KEYS[2])} end
if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], 60) end
if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], 86400) end
return {1, 0}
`;

export async function checkContactLimit(
	ip: string, env: Environment, transport: typeof fetch = fetch, timeoutMs = 2000
): Promise<RateLimit> {
	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token || new URL(url).protocol !== 'https:') throw new Error('limiter_config');
	// Keyed digests keep raw IPs and recipient addresses out of Redis.
	const hash = (value: string) => createHmac('sha256', token).update(value).digest('hex');
	const namespace = `contact:${hash(env.MAILERSEND_TO || '')}`;
	const daily = Number(env.CONTACT_DAILY_LIMIT || 25);
	if (!Number.isSafeInteger(daily) || daily < 1) throw new Error('limiter_config');
	const response = await transport(url, {
		method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(['EVAL', limitScript, '2', `${namespace}:ip:${hash(ip)}`, `${namespace}:daily`, '5', String(daily)]),
		signal: AbortSignal.timeout(timeoutMs)
	});
	if (!response.ok) throw new Error('limiter_unavailable');
	const data = await response.json() as { result?: unknown };
	if (!Array.isArray(data.result) || data.result.length !== 2 ||
		![0, 1].includes(data.result[0]) || !Number.isFinite(data.result[1])) throw new Error('limiter_response');
	return { allowed: data.result[0] === 1, retryAfter: Math.max(1, Math.ceil(data.result[1])) };
}
