import { featured, identity } from './content.js';
export const siteUrl = 'https://mikailthoriq.my.id';
const routes: Record<string, { title: string; description: string }> = {
	'/': { title: identity.name, description: `${identity.fullName} — AI/ML, backend and full-stack engineer in Depok, Indonesia. Explore selected work and get in touch.` },
	'/work/': { title: 'Work — ' + identity.name, description: 'Three engineering case studies: synthetic data research, Decklify and manga translation. Explore responsibilities, tradeoffs, evidence and source.' },
	'/about/': { title: 'About — ' + identity.name, description: 'Meet Mikail Thoriq: AI/ML research, full-stack product engineering, community teaching and the experience behind the work.' },
	'/cv/': { title: 'CV — ' + identity.name, description: 'Experience, skills, education and awards of Mikail Thoriq. Read the CV, print it or download the original PDF.' },
	'/contact/': { title: 'Contact — ' + identity.name, description: 'Discuss AI/ML, backend and web projects with Mikail Thoriq. Send a message or email directly.' }
};
export const publicPaths = [...Object.keys(routes), ...featured.map((p) => p.caseStudy!)];
export function pageMetadata(pathname: string) {
	const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '') + '/';
	const project = featured.find((p) => p.caseStudy === path);
	const meta = project ? { title: `${project.name} — ${identity.name}`, description: project.blurb } : routes[path] || routes['/'];
	return { ...meta, canonical: new URL(path, siteUrl).href };
}
