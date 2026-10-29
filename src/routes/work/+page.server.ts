import { fetchGithub } from '$lib/server/github';
import { env } from '$env/dynamic/private';

// Runs during `vite build` (every route is prerendered), so the HTML ships
// with the repositories already in it. See $lib/server/github.ts.
export const load = async () => {
	return await fetchGithub({ token: env.GITHUB_TOKEN || env.GH_TOKEN, offline: env.GITHUB_OFFLINE === '1' });
};
