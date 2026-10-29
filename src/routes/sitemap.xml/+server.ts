import { publicPaths, siteUrl } from '$lib/seo';
export const prerender = true;
export function GET() {
	const urls = publicPaths.map((path) => `<url><loc>${siteUrl}${path}</loc></url>`).join('');
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
		headers: { 'Content-Type': 'application/xml' }
	});
}
