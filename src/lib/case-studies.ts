/** Editorial summaries grounded in the existing CV and linked project artifacts. */
export interface CaseStudy {
	role: string; problem: string; constraints: string; decision: string; result: string;
	steps: string[]; caption: string; evidence: { title: string; detail: string; href: string }[];
}
export const caseStudies: Record<string, CaseStudy> = {
	prediksiprofesi: {
		role: 'Research assistant — dataset preparation, imbalanced-data experiments and model evaluation.',
		problem: 'Profession prediction across eight classes needs training data that represents less common classes as well as the majority.',
		constraints: 'Class imbalance makes a single aggregate accuracy score an incomplete view of the model. Synthetic examples also need evaluation before they can be trusted.',
		decision: 'The research compares WGAN and class-conditional WGAN-GP approaches to synthetic data. Conditioning makes class-specific generation possible, while adding training and evaluation complexity. My work covered cleaning and analysing datasets, augmentation and resampling, and evaluating accuracy, stability and efficiency.',
		result: 'Contributed data preparation and experiments to a doctoral profession-prediction study. The portfolio links the research code; it does not claim a numerical improvement without a published evaluation.',
		steps: ['Prepare imbalanced data', 'Generate synthetic examples', 'Evaluate prediction models'],
		caption: 'Research workflow overview, based on the project and CV. This is a process diagram, not a benchmark.',
		evidence: [
			{ title: 'Research implementation', detail: 'Inspect the WGAN and conditional-generation experiments in the source repository.', href: 'https://github.com/riqalter/PrediksiProfesi' },
			{ title: 'Documented responsibility', detail: 'The Doctoral Research Assistant entry records dataset work, imbalance techniques and evaluation.', href: '/cv/#experience' }
		]
	},
	decklify: {
		role: 'Co-founder and lead full-stack engineer — product roadmap, engineering and launch.',
		problem: 'Turning a prompt, a document or web research into a presentation involves gathering sources, shaping a story and making the slides editable.',
		constraints: 'Generation is only one part of the product: people also need to find saved decks, revise them, export them and pay for usage.',
		decision: 'Decklify connects ingestion and retrieval with a slide-generation pipeline and an in-browser editor. Editable output leaves room for human review rather than making generation the final step. I lead the end-to-end product and designed the pay-as-you-go credit model with Pakasir checkout, alongside library, search, regeneration and export.',
		result: 'Took the product from concept to public launch and secured PKM-K 2026 funding. These are documented project milestones; no adoption or generation-quality metric is asserted here.',
		steps: ['Prompt, document or research', 'Retrieve sources and generate slides', 'Review, edit and export'],
		caption: 'Product workflow from the CV and project description; an overview rather than a complete infrastructure map.',
		evidence: [
			{ title: 'Public product', detail: 'Open Decklify to inspect the presentation workflow.', href: 'https://decklify.id' },
			{ title: 'Role and funding milestone', detail: 'The Decklify experience and awards entries record engineering ownership and PKM-K funding.', href: '/cv/#experience' }
		]
	},
	'manga-translator': {
		role: 'Developer — manga translation and Japanese OCR integration.',
		problem: 'Read Japanese manga without waiting for an English release.',
		constraints: 'Text must first be located inside page artwork. Recognition errors then carry into translation.',
		decision: 'The prototype separates speech-bubble detection, manga-ocr recognition and translation behind a FastAPI server. Separate stages are easier to inspect, but each can introduce errors. The README distinguishes its demonstrated YOLOv11 output from the planned YOLOv12 detector.',
		result: 'A documented end-to-end prototype with a /predict interface. Translation quality and OCR fine-tuning gains are not quantified.',
		steps: ['Detect speech bubbles', 'Recognise Japanese text', 'Translate to English'],
		caption: 'Pipeline documented in the repository. Each stage can be inspected separately.',
		evidence: [
			{ title: 'Pipeline and prototype status', detail: 'The README documents detection, OCR, translation, limitations and the server interface.', href: 'https://github.com/AnimaFlow/manga-translator#approach' },
			{ title: 'Server implementation', detail: 'Inspect app.py for the image-processing integration.', href: 'https://github.com/AnimaFlow/manga-translator/blob/master/app.py' }
		]
	}
};
