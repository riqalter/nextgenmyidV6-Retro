/** Build-time data only: deployed pages update on the next build. */
import { accounts, featured, type Project } from '../content.js';
import { readFreshCache, readStaleCache, ttl, writeCache } from './github-cache.js';

export interface Account {
	login: string; type: string; name: string; bio: string; url: string; repos: number; followers: number;
}
export interface Github {
	status: 'complete' | 'partial' | 'stale' | 'unavailable';
	source: 'network' | 'cache';
	failedAccounts: string[];
	accounts: Account[];
	projects: Project[];
	fetchedAt: string;
}
export const PER_ACCOUNT = 18;
interface Options {
	token?: string;
	transport?: typeof fetch;
	timeoutMs?: number;
	cacheFile?: string;
	offline?: boolean;
}
interface GhRepo {
	name: string; full_name: string; html_url: string; description: string | null;
	language: string | null; topics?: string[]; fork: boolean; archived: boolean;
	stargazers_count: number; pushed_at: string; owner: { login: string };
}
interface GhUser {
	login: string; name: string | null; bio: string | null; html_url: string;
	type: string; public_repos: number; followers: number;
}

function toProject(repo: GhRepo): Project {
	const language = repo.language || '';
	const icon = ['Python', 'Jupyter Notebook'].includes(language) ? 'prism'
		: ['Go', 'Shell', 'PowerShell'].includes(language) ? 'terminal'
		: ['TypeScript', 'JavaScript', 'HTML', 'CSS'].includes(language) ? 'monitor' : 'code';
	return {
		slug: repo.full_name, name: repo.name, kind: language || repo.owner.login,
		year: repo.pushed_at.slice(0, 4),
		blurb: repo.description?.trim() || `${language || 'Source code'} repository by ${repo.owner.login}. Open the source for files and documentation.`,
		stack: [...new Set([language, ...(repo.topics || []).slice(0, 3)].filter(Boolean))],
		repo: repo.html_url, icon, stars: repo.stargazers_count
	};
}

export async function requestGithub({ token = '', transport = fetch, timeoutMs = 5000, offline = false }: Options = {}): Promise<Github> {
	const featuredUrls = new Set(featured.map((p) => p.repo?.toLowerCase()));
	async function get<T>(path: string): Promise<T> {
		if (offline) throw new Error('offline');
		const response = await transport(`https://api.github.com${path}`, {
			signal: AbortSignal.timeout(timeoutMs),
			headers: {
				Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
				'User-Agent': 'mikailthoriq.my.id', ...(token ? { Authorization: `Bearer ${token}` } : {})
			}
		});
		if (!response.ok) throw new Error('github_unavailable');
		return await response.json() as T;
	}
	// Independent accounts and endpoints share the same bounded wait, rather than stacking waits.
	const results = await Promise.allSettled(accounts.map(async (account) => {
		const path = account.type === 'org' ? `/orgs/${account.login}/repos` : `/users/${account.login}/repos`;
		const [user, repos] = await Promise.all([
			get<GhUser>(`/users/${account.login}`), get<GhRepo[]>(`${path}?per_page=100&sort=pushed`)
		]);
		const projects = repos.filter((repo) => !repo.fork && !repo.archived && !featuredUrls.has(repo.html_url.toLowerCase()))
			.slice(0, PER_ACCOUNT).map((repo) => ({ project: toProject(repo), pushedAt: repo.pushed_at }));
		const profile: Account = {
			login: user.login, name: user.name || user.login, bio: user.bio || '', url: user.html_url,
			type: user.type, repos: user.public_repos, followers: user.followers
		};
		return { profile, projects };
	}));
	const profiles: Account[] = [];
	const dated: { project: Project; pushedAt: string }[] = [];
	const failedAccounts: string[] = [];
	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			profiles.push(result.value.profile); dated.push(...result.value.projects);
		} else failedAccounts.push(accounts[index].login);
	});
	dated.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
	const unique = new Map(dated.map(({ project }) => [project.slug, project]));
	return {
		status: failedAccounts.length === 0 ? 'complete' : profiles.length ? 'partial' : 'unavailable',
		source: 'network', failedAccounts, accounts: profiles, projects: [...unique.values()],
		fetchedAt: new Date().toISOString()
	};
}

export async function fetchGithub(options: Options = {}): Promise<Github> {
	const cached = await readFreshCache(ttl(Boolean(options.token)), options.cacheFile);
	if (cached) return { ...cached, source: 'cache' };
	const result = await requestGithub(options);
	if (result.status === 'complete') await writeCache(result, options.cacheFile);
	else {
		const stale = await readStaleCache(options.cacheFile);
		if (stale) return { ...stale, status: 'stale', source: 'cache', failedAccounts: result.failedAccounts };
	}
	return result;
}
