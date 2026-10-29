/**
 * Every string on the site lives here.
 *
 * The CV is the source: `Mikail_Thoriq_Banowo_CV_ID_V1-1.pdf` was transcribed
 * into `roles`, `stack`, `education`, `certifications`, `awards` and
 * `featured` below. The prose is translated to English and tightened for a
 * screen; nothing was invented.
 *
 * The one thing NOT here is the repository list — that is fetched from the
 * GitHub API at build time by `$lib/server/github.ts`.
 */

export interface Project {
	slug: string;
	name: string;
	/** one line, machine telemetry in the Finder info bar */
	kind: string;
	year: string;
	blurb: string;
	stack: string[];
	href?: string;
	repo?: string;
	caseStudy?: string;
	/** which 1-bit icon the card wears */
	icon: 'code' | 'mail' | 'monitor' | 'film' | 'camera' | 'terminal' | 'folder' | 'prism';
	/** GitHub stars — only rendered when present */
	stars?: number;
}

export interface Role {
	title: string;
	org: string;
	place: string;
	period: string;
	bullets: string[];
}

export interface Education {
	org: string;
	degree: string;
	period: string;
	note: string;
}

export interface Certification {
	title: string;
	issuer: string;
	year: string;
}

export interface Award {
	title: string;
	org: string;
	year: string;
}

export const identity = {
	name: 'Mikail Thoriq',
	fullName: 'Mikail Thoriq Kariemshah Banowo',
	initials: 'MT',
	/** the line the hero types out, one phrase at a time */
	roles: ['AI/ML Engineer', 'Backend Engineer', 'Full-Stack Developer', 'ML Researcher'],
	// the sentence a screen reader hears instead of the animated line
	rolesSentence: 'AI/ML engineer, backend engineer, full-stack developer, and ML researcher.',
	title: 'AI/ML Engineer · Backend & Full-Stack Developer',
	location: 'Depok, Indonesia',
	/**
	 * The public contact address. On your own domain, not the Gmail — it stays
	 * stable if you ever change providers, and it does not publish the personal
	 * inbox. Routed onward to Gmail behind the scenes.
	 */
	email: 'contact@mikailthoriq.my.id',
	available: true
};

export const nav = [
	{ href: '/', label: 'Home' },
	{ href: '/work', label: 'Work' },
	{ href: '/about', label: 'About' },
	{ href: '/cv', label: 'CV' },
	{ href: '/contact', label: 'Contact' }
];

/** Hero, about, contact — the confessional register. */
export const copy = {
	heroLead:
		'I build AI products, backend services, and the web platforms that sit on ' +
		'top of them — from the research notebook to the thing people actually use.',
	about:
		"I build AI products end to end: the model, the service behind it, and the " +
		"interface in front of it. Most of my work lives in Python and Go, across the " +
		"whole machine-learning cycle — GAN-based synthetic data, computer vision, " +
		"RAG and multi-agent systems. Right now that means co-founding Decklify, an " +
		"AI SaaS that turns prompts, documents and web research into presentations. " +
		"The parts I enjoy most are the ones that do not photograph well: the " +
		"training pipeline that has to survive a retrain, the API that stays up when " +
		"the model behind it does not.",
	cvLead:
		'The long version. Same person, more rows — the full record as a document ' +
		'you can print or download.',
	contactLead:
		'Got something that needs building, breaking, or explaining badly? The window ' +
		'is open.'
};

export const links: { label: string; href: string }[] = [
	{ label: 'github.com/riqalter', href: 'https://github.com/riqalter' },
	{ label: 'github.com/thq642', href: 'https://github.com/thq642' },
	{ label: 'github.com/AnimaFlow', href: 'https://github.com/AnimaFlow' },
	{ label: 'linkedin.com/in/mikailthoriq', href: 'https://linkedin.com/in/mikailthoriq' }
];

/** The three accounts whose repositories fill the Work window, in fetch order. */
export const accounts = [
	{ login: 'riqalter', type: 'user' },
	{ login: 'thq642', type: 'user' },
	{ login: 'AnimaFlow', type: 'org' }
] as const;

/**
 * Hand-written projects — the CV's "PROYEK PILIHAN". These are shown first and
 * never depend on the API: if GitHub is unreachable at build time, the page
 * still has something true on it.
 */
export const featured: Project[] = [
	{
		slug: 'prediksiprofesi',
		caseStudy: '/work/prediksiprofesi/',
		name: 'PrediksiProfesi',
		kind: 'research',
		year: '2025',
		blurb:
			'Wasserstein GAN and Conditional WGAN-GP trained to synthesise high-quality ' +
			'data for profession prediction across 8 imbalanced classes.',
		stack: ['Python', 'PyTorch', 'TensorFlow', 'GAN', 'WGAN', 'CWGAN-GP'],
		repo: 'https://github.com/riqalter/PrediksiProfesi',
		icon: 'prism'
	},
	{
		slug: 'decklify',
		caseStudy: '/work/decklify/',
		name: 'Decklify',
		kind: 'product',
		year: '2026',
		blurb:
			'AI SaaS that turns prompts, documents and web research into sourced, ' +
			'narration-ready slides — ingest, RAG search, slide pipeline, in-browser editor.',
		stack: ['Full-Stack', 'Next.js', 'React', 'LLM', 'RAG'],
		href: 'https://decklify.id',
		icon: 'monitor'
	},
	{
		slug: 'manga-translator',
		caseStudy: '/work/manga-translator/',
		name: 'Manga Translator & OCR',
		kind: 'project',
		year: '2025',
		blurb:
			'End-to-end manga translator pairing Japanese OCR with automatic ' +
			'translation, plus a Kaggle pipeline for fine-tuning the OCR model.',
		stack: ['Python', 'PyTorch', 'Computer Vision', 'OCR'],
		repo: 'https://github.com/AnimaFlow/manga-translator',
		icon: 'film'
	}
];

/** Flat list kept for the home page preview, which shows the featured three. */
export const projects: Project[] = featured;

/** PENGALAMAN PROFESIONAL — the CV's work history, newest first. */
export const roles: Role[] = [
	{
		title: 'Co-Founder & Full-Stack Engineer',
		org: 'Decklify',
		place: 'Depok, Indonesia',
		period: 'May 2026 – Present',
		bullets: [
			'Co-founded Decklify (decklify.id), an AI SaaS that turns prompts, documents and web research into tidy presentations; secured PKM-K 2026 funding.',
			'Lead engineering and run the product end to end — from concept and roadmap to public launch.',
			'Designed a pay-as-you-go credit model with secure checkout (Pakasir), plus deck management: library, search, regeneration and export.'
		]
	},
	{
		title: 'Machine Learning Associate → Supervisor, Knowledge & Development',
		org: 'Google Developer Groups on Campus, Universitas Gunadarma',
		place: 'Depok, Indonesia',
		period: 'Nov 2024 – Present',
		bullets: [
			'Teach weekly Machine Learning & AI classes to the community, covering RAG, multi-agent systems and the Model Context Protocol (MCP).',
			'Promoted to Supervisor: lead training strategy, write internal learning material, and oversee members’ Google technology projects.'
		]
	},
	{
		title: 'Laboratory Assistant',
		org: 'LepKom (Lembaga Pengembangan Komputerisasi), Universitas Gunadarma',
		place: 'Depok, Indonesia',
		period: 'Sep 2024 – Sep 2026',
		bullets: [
			'Teach intermediate Go and C# practicums; coach students through debugging and technical problem-solving.',
			'Grade practicum reports and give constructive feedback so the learning actually lands.'
		]
	},
	{
		title: 'Doctoral Research Assistant',
		org: 'Universitas Gunadarma',
		place: 'Depok, Indonesia',
		period: 'Sep 2024 – Oct 2024',
		bullets: [
			'Worked with doctoral researchers on the PrediksiProfesi dissertation study; managed, cleaned and analysed large-scale datasets for profession prediction.',
			'Researched and applied imbalanced-data techniques — augmentation, resampling and GAN-based synthetic data generation.',
			'Evaluated model performance across several metrics (accuracy, stability, efficiency) to support the research conclusions.'
		]
	},
	{
		title: 'Practicum Assistant — NVIDIA DGX (High-Performance Computing)',
		org: 'Universitas Gunadarma',
		place: 'Depok, Indonesia',
		period: 'Sep 2023 – Dec 2023',
		bullets: [
			'Guided students through the NVIDIA DGX systems; debugged code and cleared hardware and software problems in the high-performance computing lab.'
		]
	}
];

/**
 * The About page needs a flat four-field record per job; the CV page needs the
 * full bullets. One source, two projections — derived, never written twice.
 */
export const experience = roles.map((role) => ({
	role: role.title,
	org: role.org,
	period: role.period,
	note: role.bullets[0]
}));

/** KETERAMPILAN TEKNIS — the CV's skills, grouped the way the CV groups them. */
export const stack: { group: string; items: string[] }[] = [
	{ group: 'Languages', items: ['Python', 'Go', 'JavaScript', 'TypeScript', 'C#'] },
	{
		group: 'AI / Machine Learning',
		items: [
			'Machine Learning',
			'Deep Learning',
			'PyTorch',
			'TensorFlow',
			'GAN (WGAN, CWGAN-GP)',
			'Computer Vision',
			'OpenCV',
			'YOLO (Ultralytics)',
			'Fine-tuning (Unsloth)',
			'MLflow'
		]
	},
	{
		group: 'LLM / Generative AI',
		items: [
			'LLM',
			'RAG',
			'Multi-Agent Systems',
			'Model Context Protocol',
			'LangChain',
			'LangGraph',
			'Google GenAI SDK',
			'llama.cpp'
		]
	},
	{
		group: 'Backend',
		items: ['FastAPI', 'Node.js', 'REST API design', 'Redis', 'Server-side programming']
	},
	{
		group: 'Frontend / Full-Stack',
		items: ['Next.js', 'React', 'HTML', 'CSS', 'Web application development']
	},
	{
		group: 'DevOps & Tools',
		items: ['Docker', 'Linux', 'Git', 'GitHub Actions', 'CI/CD', 'Streamlit']
	}
];

/** PENDIDIKAN */
export const education: Education[] = [
	{
		org: 'Universitas Gunadarma',
		degree: 'Bachelor of Informatics (S1)',
		period: 'Sep 2022 – Aug 2026',
		note: 'GPA 3.83 / 4.00 · Depok, Indonesia'
	}
];

/** SERTIFIKASI & PELATIHAN */
export const certifications: Certification[] = [
	{ title: 'Building a Machine Learning System', issuer: 'Dicoding', year: '2025' },
	{ title: 'Computer Vision for Industrial Inspection', issuer: 'NVIDIA', year: '2025' },
	{ title: 'Develop GenAI Apps with Gemini and Streamlit', issuer: 'Dicoding', year: '' },
	{ title: 'Machine Learning Training', issuer: 'ASAH (Dicoding × Accenture)', year: '2026' },
	{ title: 'Intermediate Linux Server Administration', issuer: 'LepKom Gunadarma', year: '2025' },
	{ title: 'Intermediate Go Programming', issuer: 'LepKom Gunadarma', year: '2024' }
];

/** PENGHARGAAN & PENCAPAIAN */
export const awards: Award[] = [
	{
		title: 'Finalist — GEMASTIK XVIII, Data Mining Division',
		org: 'Kemendiktisaintek RI × Telkom University',
		year: '2025'
	},
	{ title: 'Finalist — Arkavidia 9.0 Hackvidia', org: 'Institut Teknologi Bandung (ITB)', year: '2025' },
	{ title: 'Finalist — Regression Rumble', org: 'Neurontara Data Clash', year: '2025' },
	{
		title: 'Funding recipient — PKM-K 2026 (Student Creativity Program, Entrepreneurship)',
		org: 'for Decklify',
		year: '2026'
	},
	{ title: 'Grant recipient — P2MW 2024 (Student Entrepreneur Development)', org: '', year: '2024' },
	{
		title: '2nd Runner-Up — KOMPRES 15, Software Creation Competition, Machine Learning category',
		org: '',
		year: '2024'
	}
];

export const languages: [string, string][] = [
	['Indonesian', 'Native speaker'],
	['English', 'Professional']
];

export const facts: [string, string][] = [
	['Based in', identity.location],
	['Doing', 'AI/ML · Backend · Full-Stack'],
	['Focus', 'GAN · Computer Vision · RAG · Multi-Agent'],
	['Git', 'github.com/riqalter']
];

/** Section numbering — red, mono, the machine counting its own windows. */
export const sections = {
	hero: { kicker: '00', title: 'Mikail Thoriq', sub: '' },
	about: { kicker: '01', title: 'About', sub: 'what I do' },
	work: { kicker: '02', title: 'Work', sub: 'selected projects' },
	stack: { kicker: '03', title: 'Stack', sub: 'the tools' },
	cv: { kicker: '04', title: 'CV', sub: 'the long version' },
	contact: { kicker: '05', title: 'Contact', sub: 'get in touch' }
} as const;

/** The printed CV, served from /static so the download button always resolves. */
export const cvFile = {
	label: 'Mikail_Thoriq_Banowo_CV_ID_V1-1.pdf',
	href: '/cv/mikail-thoriq-banowo-cv.pdf'
};
