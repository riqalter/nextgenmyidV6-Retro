import { fetchGithub } from '$lib/server/github';

// Runs during `vite build` (every route is prerendered), so the HTML ships
// with the repositories already in it. See $lib/server/github.ts.
export const load = async () => {
	const github = await fetchGithub();

	return {
		accounts: github.accounts,
		projects: github.ok ? github.projects : [],
		ok: github.ok,
		error: github.error,
		fetchedAt: github.fetchedAt
	};
};