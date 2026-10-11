/**
 * A build-time cache for the GitHub response.
 *
 * Why this exists at all: a build must never ship an empty repository window.
 * Two things can go wrong — the network fails, or the API rate-limits us — and
 * in both cases the last good response is still a better page than nothing.
 *
 * How long a cache entry lives depends on whether a token is configured:
 *
 *   no token  → 60 requests/hour per IP, and a build spends 6. Cache hard (6h)
 *               so ten builds an hour do not rate-limit the machine.
 *   token     → 5000 requests/hour. The rate limit is a non-issue, so the cache
 *               is only a network-failure cushion and can stay short (30 min).
 *
 * Either way it is a plain JSON file at the repo root, disposable — delete it
 * to force a refresh. `.gitignore` already excludes it.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Github } from '$lib/server/github';

const CACHE = resolve('.github-cache.json');

const HOUR = 60 * 60 * 1000;

/** With a token the limit is 5000/hr, so only the failure cushion matters. */
export function ttl(hasToken: boolean): number {
	return hasToken ? HOUR / 2 : 6 * HOUR;
}

interface Entry {
	fetchedAt: string;
	at: number;
	data: Github;
}

async function readEntry(): Promise<Entry | null> {
	try {
		const entry = JSON.parse(await readFile(CACHE, 'utf8')) as Entry;
		// A cache written by older code, or a corrupt file, is discarded rather
		// than half-trusted.
		if (!entry?.at || !entry.data || !Array.isArray(entry.data.projects)) return null;
		return entry;
	} catch {
		return null; // no cache yet — the normal first-build case
	}
}

/** Served without touching the network. Null when absent or expired. */
export async function readFreshCache(maxAgeMs: number): Promise<Github | null> {
	const entry = await readEntry();
	if (!entry) return null;
	return Date.now() - entry.at < maxAgeMs ? entry.data : null;
}

/** Ignores the TTL — this is the "the network is down" path. */
export async function readStaleCache(): Promise<Github | null> {
	return (await readEntry())?.data ?? null;
}

export async function writeCache(data: Github): Promise<void> {
	const entry: Entry = { fetchedAt: data.fetchedAt, at: Date.now(), data };
	try {
		await mkdir(dirname(CACHE), { recursive: true });
		await writeFile(CACHE, JSON.stringify(entry, null, '\t'));
	} catch {
		// A read-only checkout must not fail the build over a cache file.
	}
}