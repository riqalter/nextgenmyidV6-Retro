import { error } from '@sveltejs/kit';
import { featured } from '$lib/content';
import { caseStudies } from '$lib/case-studies';
import type { PageLoad } from './$types';

export const entries = () => featured.map(({ slug }) => ({ slug }));
export const load: PageLoad = ({ params }) => {
	const project = featured.find(({ slug }) => slug === params.slug);
	const study = caseStudies[params.slug];
	if (!project || !study) error(404, 'Project not found');
	return { project, study };
};
