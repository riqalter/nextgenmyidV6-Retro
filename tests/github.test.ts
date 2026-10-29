import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchGithub, requestGithub, PER_ACCOUNT } from '../src/lib/server/github.js';
import { readFreshCache, readStaleCache, writeCache, ttl } from '../src/lib/server/github-cache.js';
import { repositoryStatus } from '../src/lib/github-status.js';
import { accounts, featured } from '../src/lib/content.js';
import { caseStudies } from '../src/lib/case-studies.js';
import { pageMetadata, publicPaths } from '../src/lib/seo.js';

function mockGithub(failed: string[] = [], empty = false): typeof fetch {
	return async (input) => {
		const path = new URL(String(input)).pathname.split('/');
		const login = path[2];
		if (failed.includes(login)) return new Response(null, { status: 503 });
		if (path[3] === 'repos') return Response.json(empty ? [] : Array.from({ length: 22 }, (_, index) => ({
			name: 'a-very-long-repository-name-' + index, full_name: login + '/' + index,
			html_url: `https://github.com/${login}/${index}`, description: null, language: 'TypeScript',
			topics: ['tool', 'tool'], fork: index === 0, archived: index === 1,
			stargazers_count: 0, pushed_at: `2026-10-${String(29 - index).padStart(2, '0')}T00:00:00Z`, owner: { login }
		})));
		return Response.json({ login, name: login, bio: null, html_url: 'https://github.com/' + login, type: 'User', public_repos: 22, followers: 0 });
	};
}
async function withCache(run: (file: string) => Promise<void>) {
	const directory = await mkdtemp(join(tmpdir(), 'pixelstyle-cache-'));
	try { await run(join(directory, 'cache.json')); }
	finally { await rm(directory, { recursive: true, force: true }); }
}

test('complete snapshot caps each account, orders by push and describes unnamed repositories', async () => {
	const result = await requestGithub({ transport: mockGithub() });
	assert.equal(result.status, 'complete');
	assert.equal(result.projects.length, accounts.length * PER_ACCOUNT);
	assert.equal(result.accounts.length, accounts.length);
	assert(result.projects.every((project) => project.blurb.length > 0));
	assert(result.projects.every((project) => new Set(project.stack).size === project.stack.length));
	assert(result.projects[0].name.endsWith('-2'));
	assert.equal((await requestGithub({ transport: mockGithub([], true) })).status, 'complete');
});

test('partial cold results have their own label and never create a complete cache', async () => {
	await withCache(async (cacheFile) => {
		const result = await fetchGithub({ cacheFile, transport: mockGithub(['riqalter']) });
		assert.equal(result.status, 'partial');
		assert.deepEqual(result.failedAccounts, ['riqalter']);
		assert.equal(result.accounts.length, 2);
		assert.match(repositoryStatus(result), /partial snapshot/);
		assert.equal(await readStaleCache(cacheFile), null);
		await assert.rejects(readFile(cacheFile));
	});
});

test('partial/all-account failure preserves the last complete cache as a stale snapshot', async () => {
	await withCache(async (cacheFile) => {
		const complete = await requestGithub({ transport: mockGithub() });
		const original = JSON.stringify({ version: 2, at: Date.now() - 7 * 3_600_000, data: complete });
		await writeFile(cacheFile, original);
		for (const failed of [['riqalter'], accounts.map((account) => account.login)]) {
			const result = await fetchGithub({ cacheFile, transport: mockGithub(failed) });
			assert.equal(result.status, 'stale');
			assert.equal(result.source, 'cache');
			assert.equal(result.projects.length, complete.projects.length);
			assert.equal(result.fetchedAt, complete.fetchedAt);
			assert.match(repositoryStatus(result), /last complete saved snapshot/);
			assert.equal(await readFile(cacheFile, 'utf8'), original);
		}
	});
});

test('fresh complete cache avoids external calls and reports the actual source', async () => {
	await withCache(async (cacheFile) => {
		await writeCache(await requestGithub({ transport: mockGithub() }), cacheFile);
		const result = await fetchGithub({ cacheFile, transport: async () => { throw new Error('Unexpected fetch'); } });
		assert.equal(result.status, 'complete');
		assert.equal(result.source, 'cache');
		assert.match(repositoryStatus(result), /reused during this build/);
		assert(await readFreshCache(ttl(false), cacheFile));
		assert.equal(ttl(true), 30 * 60_000);
	});
});

test('missing, corrupt, legacy and partial cache files are discarded on offline builds', async () => {
	await withCache(async (cacheFile) => {
		const complete = await requestGithub({ transport: mockGithub() });
		for (const body of ['{bad', '{}', JSON.stringify({ at: Date.now(), data: complete }), JSON.stringify({ version: 2, at: Date.now(), data: { ...complete, status: 'partial' } }), JSON.stringify({ version: 2, at: Date.now(), data: { ...complete, projects: [null] } })]) {
			await writeFile(cacheFile, body);
			assert.equal(await readStaleCache(cacheFile), null);
			const result = await fetchGithub({ cacheFile, offline: true });
			assert.equal(result.status, 'unavailable');
			assert.equal(result.projects.length, 0);
			assert.match(repositoryStatus(result), /featured case studies are still available/);
		}
	});
});

test('hanging GitHub requests abort within the configured budget', async () => {
	const transport: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('No abort')), 1000);
		init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); }, { once: true });
	});
	const start = Date.now();
	const result = await requestGithub({ transport, timeoutMs: 10 });
	assert.equal(result.status, 'unavailable');
	assert(Date.now() - start < 500);
});

test('all selected work has a local story, evidence and route-specific sharing metadata', () => {
	for (const project of featured) {
		assert(project.caseStudy);
		const study = caseStudies[project.slug];
		assert(study.role && study.problem && study.constraints && study.decision && study.result);
		assert(study.evidence.length >= 1);
		assert.equal(study.steps.length, 3);
		assert(publicPaths.includes(project.caseStudy));
		assert.equal(pageMetadata(project.caseStudy).title, project.name + ' — Mikail Thoriq');
	}
	assert.equal(new Set(publicPaths).size, publicPaths.length);
	assert.equal(pageMetadata('/contact').canonical, 'https://mikailthoriq.my.id/contact/');
});
