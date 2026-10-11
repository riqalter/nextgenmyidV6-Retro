import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const KEY = 'mt-theme';
const EVENT = 'mt:theme';

const SURFACE = { light: '#f5f2ea', dark: '#141414' } as const;

/**
 * Theme is a two-state switch, not a `prefers-color-scheme` branch.
 *
 * The OS preference only decides the *initial* value, exactly like the motion
 * switch — so a visitor who has an opinion can override the machine, and one
 * who has not is still respected. Every token swap happens via the
 * `data-theme` attribute, which is resolved inline in app.html before paint.
 */
class ThemeStore {
	current = $state<Theme>('light');

	constructor() {
		if (!browser) return;
		const fromDoc = document.documentElement.dataset.theme;
		this.current = fromDoc === 'dark' ? 'dark' : 'light';
	}

	get isDark() {
		return this.current === 'dark';
	}

	toggle() {
		this.set(this.current === 'dark' ? 'light' : 'dark');
	}

	set(next: Theme) {
		this.current = next;
		if (!browser) return;

		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(KEY, next);
		} catch {
			// private mode throws — the choice just won't persist
		}
		// keep the browser chrome (address bar) matching the page
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', SURFACE[next]);

		document.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: next }));
	}
}

export const theme = new ThemeStore();

/** Subscribe to theme changes — canvas/WebGL work has to re-render its inks. */
export function onThemeChange(fn: () => void): () => void {
	if (!browser) return () => {};
	const handler = () => fn();
	document.addEventListener(EVENT, handler);
	return () => document.removeEventListener(EVENT, handler);
}

/**
 * Follow the OS only while the visitor has expressed no preference.
 * Once they toggle, their choice stands — including across a midnight switch.
 */
export function watchSystemTheme(): () => void {
	if (!browser) return () => {};
	const mq = matchMedia('(prefers-color-scheme: dark)');
	const handler = () => {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem(KEY);
		} catch {
			/* ignore */
		}
		if (saved === 'light' || saved === 'dark') return;
		theme.set(mq.matches ? 'dark' : 'light');
	};
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
}

/** Read a resolved token value, for canvas/WebGL which can't use var(). */
export function token(name: string, fallback: string): string {
	if (!browser) return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}