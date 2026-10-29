import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Github } from './github.js';

const CACHE = resolve('.github-cache.json');
const HOUR = 3_600_000;
export const ttl = (hasToken: boolean): number => hasToken ? HOUR / 2 : 6 * HOUR;
interface Entry { version: 2; at: number; data: Github }

async function readEntry(file = CACHE): Promise<Entry | null> {
	try {
		const entry = JSON.parse(await readFile(file, 'utf8')) as Entry;
		const data = entry.data;
		if (entry.version !== 2 || !Number.isFinite(entry.at) || entry.at > Date.now() || entry.at <= 0 ||
			data?.status !== 'complete' || !Number.isFinite(Date.parse(data.fetchedAt)) ||
			!Array.isArray(data.failedAccounts) || data.failedAccounts.length ||
			!Array.isArray(data.accounts) || !Array.isArray(data.projects)) return null;
		if (!data.accounts.every((a) => a && ['login', 'type', 'name', 'bio', 'url'].every((key) =>
			typeof a[key as keyof typeof a] === 'string') && Number.isFinite(a.repos) && Number.isFinite(a.followers))) return null;
		if (!data.projects.every((p) => p && ['slug', 'name', 'kind', 'year', 'blurb'].every((key) =>
			typeof p[key as keyof typeof p] === 'string') && Array.isArray(p.stack) && p.stack.every((s) => typeof s === 'string') &&
			['code', 'mail', 'monitor', 'film', 'camera', 'terminal', 'folder', 'prism'].includes(p.icon) && typeof p.repo === 'string')) return null;
		return entry;
	} catch { return null; }
}

export async function readFreshCache(maxAgeMs: number, file = CACHE): Promise<Github | null> {
	const entry = await readEntry(file);
	return entry && Date.now() - entry.at < maxAgeMs ? entry.data : null;
}
export async function readStaleCache(file = CACHE): Promise<Github | null> {
	return (await readEntry(file))?.data ?? null;
}
export async function writeCache(data: Github, file = CACHE): Promise<void> {
	if (data.status !== 'complete' || data.failedAccounts.length) return;
	try {
		await mkdir(dirname(file), { recursive: true });
		const temporary = `${file}.${process.pid}.tmp`;
		await writeFile(temporary, JSON.stringify({ version: 2, at: Date.now(), data }));
		await rename(temporary, file);
	} catch { /* Read-only CI checkouts can still build. */ }
}
