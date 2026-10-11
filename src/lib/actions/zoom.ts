import { motion } from '$lib/motion.svelte';

const FRAMES = 9;
const STEP = 26; // ms per frame → ~234ms total, under a quarter second
const TRAIL = 3; // rectangles alive at once: reads as zooming, not fading

function smoothstep(t: number) {
	return t * t * (3 - 2 * t);
}

/** One-shot: draw the rectangles, then reveal the real element behind them. */
function drawZoom(el: HTMLElement) {
	// Motion off, or no JS-side reason to animate → just open it.
	if (!motion.enabled) {
		el.classList.add('is-open');
		return;
	}
	// NOTE: do NOT re-check the observer's `data-zooming` guard here — it is
	// already set by the time this runs, so checking it would abort every
	// single call. This guard is for idempotency against the *second* frame.
	if (el.classList.contains('is-open')) return;

	const r = el.getBoundingClientRect();
	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;

	const rects: HTMLElement[] = [];
	let cancelled = false;

	for (let i = 0; i <= FRAMES; i++) {
		setTimeout(() => {
			if (cancelled) return;
			const e = smoothstep(i / FRAMES);
			const w = r.width * (0.06 + 0.94 * e);
			const h = r.height * (0.06 + 0.94 * e);

			const node = document.createElement('div');
			node.className = 'zoom-rect';
			node.style.cssText =
				`left:${cx - w / 2}px;top:${cy - h / 2}px;` + `width:${w}px;height:${h}px`;
			document.body.append(node);
			rects.push(node);

			if (rects.length > TRAIL) rects.shift()?.remove();

			if (i === FRAMES) {
				el.classList.add('is-open');
				delete el.dataset.zooming;
				setTimeout(() => {
					if (cancelled) return;
					rects.splice(0).forEach((n) => n.remove());
				}, STEP);
			}
		}, i * STEP);
	}

	return () => {
		cancelled = true;
		rects.splice(0).forEach((n) => n.remove());
	};
}

/**
 * The site's signature entrance: an element draws a zoom rectangle from its
 * own centre when it scrolls in, then the real thing pops in behind it.
 *
 * Re-entrancy is guarded on `data-zooming` + `.is-open`, because
 * IntersectionObserver is free to fire twice and must not break anything.
 */
export function zoom(node: HTMLElement, delay = 0) {
	let observer: IntersectionObserver | undefined;
	let cancelDraw: (() => void) | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// the CSS gate reads this attribute; the action owns it rather than
	// asking every call site to remember the contract
	node.dataset.zoom = '';

	const open = () => {
		if (node.classList.contains('is-open')) return;
		if (delay > 0) {
			timer = setTimeout(() => (cancelDraw = drawZoom(node)), delay);
		} else {
			cancelDraw = drawZoom(node);
		}
	};

	// Escape hatch 1: no IntersectionObserver → open everything immediately.
	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-open');
	} else {
		// The -12% bottom inset opens the window once its top edge is 12% up,
		// which is why a tall window opens even though it can't fit.
		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					node.dataset.zooming = '1';
					open();
					observer?.unobserve(node);
				}
			},
			{ threshold: 0, rootMargin: '0px 0px -12% 0px' }
		);
		observer.observe(node);
	}

	// Escape hatch 2: a keyboard user tabs in before the window has opened.
	// Without this, focus would land on an element that is still invisible.
	const onFocusIn = () => node.classList.add('is-open');
	node.addEventListener('focusin', onFocusIn);

	return {
		destroy() {
			observer?.disconnect();
			node.removeEventListener('focusin', onFocusIn);
			clearTimeout(timer);
			cancelDraw?.();
		}
	};
}