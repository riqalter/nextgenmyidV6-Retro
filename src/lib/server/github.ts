/**
 * GitHub, fetched at BUILD time.
 *
 * The site is prerendered to static HTML (adapter-static, `prerender = true`),
 * so this runs once during `vite build` and its result is baked into the page.
 * No runtime API call, no client-side rate-limit exposure — the visitor never
 * talks to GitHub. A `GITHUB_TOKEN` raises the limit from 60/hr to 5000/hr and
 * shortens the cache window; see github-cache.ts.
 *
 * Failure is expected and handled: an offline build, a rate-limited IP, a bad
 * token, or a renamed account must not take the build down. When any of that
 * happens the caller falls back to the last cached copy, or to the hand-written
 * `featured` list, and the page says which happened.
 */

import { env } from '$env/dynamic/private';
import { accounts, featured, type Project } from '$lib/content';
import { readFreshCache, readStaleCache, ttl, writeCache } from '$lib/server/github-cache';

export interface Account {
	login: string;
	type: string;
	name: string;
	bio: string;
	url: string;
	repos: number;
	followers: number;
}

export interface Github {
	ok: boolean;
	/** why it failed, when ok is false — shown in the Finder status bar */
	error?: string;
	accounts: Account[];
	projects: Project[];
	/** ISO date of the fetch, printed in the Finder info bar */
	fetchedAt: string;
}

/** Per-account cap. riqalter alone has 76 repos; the page is a reading list. */
const PER_ACCOUNT = 18;
const API = 'https://api.github.com';

const headers: Record<string, string> = {
	Accept: 'application/vnd.github+json',
	'X-GitHub-Api-Version': '2022-11-28',
	'User-Agent': 'mikailthoriq.my.id'
};

/**
 * Optional token. Unauthenticated is 60 requests/hour per IP; a token raises it
 * to 5000 and lifts the per-endpoint caps that hide repos 4,000+ stars deep.
 * Set `GITHUB_TOKEN` in `.env` (gitignored) or in the CI environment.
 *
 * Read permissions only — this build never writes to GitHub.
 */
function token(): string {
	return env.GITHUB_TOKEN || env.GH_TOKEN || '';
}

function authHeader(): Record<string, string> {
	const t = token();
	return t ? { Authorization: `Bearer ${t}` } : {};
}

interface GhRepo {
	name: string;
	full_name: string;
	html_url: string;
	description: string | null;
	language: string | null;
	topics?: string[];
	fork: boolean;
	archived: boolean;
	stargazers_count: number;
	pushed_at: string;
	owner: { login: string };
}

interface GhUser {
	login: string;
	name: string | null;
	bio: string | null;
	html_url: string;
	type: string;
	public_repos: number;
	followers: number;
}

async function get<T>(path: string): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		headers: { ...headers, ...authHeader() }
	});
	if (!res.ok) throw new Error(`GitHub ${res.status} ${res.statusText} for ${path}`);
	return (await res.json()) as T;
}

/** 1-bit icon by primary language. Falls back to the generic code mark. */
function iconFor(language: string | null): Project['icon'] {
	switch (language) {
		case 'Python':
		case 'Jupyter Notebook':
			return 'prism';
		case 'TypeScript':
		case 'JavaScript':
		case 'HTML':
		case 'CSS':
			return 'monitor';
		case 'Go':
		case 'Shell':
		case 'PowerShell':
			return 'terminal';
		default:
			return 'code';
	}
}

/** Topics are noisy; the language always leads, then at most three topics. */
function tags(repo: GhRepo): string[] {
	const topics = (repo.topics ?? []).slice(0, 3);
	return [repo.language, ...topics].filter((t): t is string => Boolean(t));
}

function toProject(repo: GhRepo): Project {
	return {
		slug: repo.full_name,
		name: repo.name,
		// "Kind" is the Finder's file-type column: language if there is one,
		// otherwise the owning account — never a bare "repository".
		kind: repo.language ?? repo.owner.login,
		year: repo.pushed_at.slice(0, 4),
		blurb: repo.description?.trim() ?? '',
		stack: tags(repo),
		// Always the repository. The window says "GitHub — all repositories",
		// and a card that sometimes opens a demo and sometimes the source is
		// worse than one that always opens the source.
		repo: repo.html_url,
		icon: iconFor(repo.language),
		stars: repo.stargazers_count
	};
}

/**
 * All three accounts, newest push first. A failure on any one account is
 * recorded but does not discard the other two — partial data beats none.
 *
 * Cached, because a build must never ship an empty repository window; the TTL
 * depends on whether a token is configured (see github-cache.ts).
 */
export async function fetchGithub(): Promise<Github> {
	const cached = await readFreshCache(ttl(Boolean(token())));
	if (cached) return cached;

	const result = await requestGithub();

	// Only a fully successful fetch is worth caching; a half-empty response
	// must not be served to the next several builds.
	if (result.ok) await writeCache(result);
	else {
		// Network down or rate-limited: the last good copy is still a real page.
		const stale = await readStaleCache();
		if (stale) return { ...stale, error: result.error };
	}

	return result;
}

async function requestGithub(): Promise<Github> {
	const fetchedAt = new Date().toISOString().slice(0, 10);
	const profiles: Account[] = [];
	const reposByDate: GhRepo[] = [];
	const problems: string[] = [];

	/** The hand-written projects already lead the page; do not repeat them below. */
	const featuredUrls = new Set(
		featured.map((p) => p.repo?.toLowerCase()).filter((u): u is string => Boolean(u))
	);

	for (const account of accounts) {
		const reposPath =
			account.type === 'org' ? `/orgs/${account.login}/repos` : `/users/${account.login}/repos`;

		try {
			const user = await get<GhUser>(`/users/${account.login}`);
			profiles.push({
				login: user.login,
				type: user.type,
				name: user.name ?? user.login,
				bio: user.bio ?? '',
				url: user.html_url,
				repos: user.public_repos,
				followers: user.followers
			});

			const repos = await get<GhRepo[]>(`${reposPath}?per_page=100&sort=pushed`);
			const live = repos.filter(
				(r) => !r.fork && !r.archived && !featuredUrls.has(r.html_url.toLowerCase())
			);
			reposByDate.push(...live.slice(0, PER_ACCOUNT));
		} catch (e) {
			problems.push(`${account.login}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	if (reposByDate.length === 0) {
		return {
			ok: false,
			error: problems.join(' · ') || 'no repositories returned',
			accounts: profiles,
			projects: [],
			fetchedAt
		};
	}

	// Most recently pushed first, across all three accounts — the API hands
	// them back per-account, so the merge has to be ordered here.
	reposByDate.sort((a, b) => b.pushed_at.localeCompare(a.pushed_at));
	const projects = reposByDate.map(toProject);

	return {
		ok: true,
		error: problems.length ? problems.join(' · ') : undefined,
		accounts: profiles,
		projects,
		fetchedAt
	};
}