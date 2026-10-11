import { browser } from '$app/environment';

export type MotionPref = 'on' | 'off';

const KEY = 'mt-motion';
const EVENT = 'mt:motion';

/**
 * Single source of truth for the motion switch.
 *
 * The initial value is already resolved by the inline <head> script in
 * app.html — before first paint — and written to `<html data-motion>`. This
 * store adopts that value rather than re-deciding it, so there is exactly one
 * decision point and it cannot disagree with what CSS already painted.
 */
class MotionStore {
	current = $state<MotionPref>('on');

	constructor() {
		if (!browser) return;
		const fromDoc = document.documentElement.dataset.motion;
		this.current = fromDoc === 'off' ? 'off' : 'on';
	}

	get enabled() {
		return this.current === 'on';
	}

	toggle() {
		this.set(this.current === 'on' ? 'off' : 'on');
	}

	set(next: MotionPref) {
		this.current = next;
		if (!browser) return;

		document.documentElement.dataset.motion = next;
		try {
			localStorage.setItem(KEY, next);
		} catch {
			// private mode throws — the preference just won't persist
		}
		document.dispatchEvent(new CustomEvent<MotionPref>(EVENT, { detail: next }));
	}
}

export const motion = new MotionStore();

/** Subscribe to motion changes. Returns an unsubscribe function. */
export function onMotionChange(fn: () => void): () => void {
	if (!browser) return () => {};
	const handler = () => fn();
	document.addEventListener(EVENT, handler);
	return () => document.removeEventListener(EVENT, handler);
}

/**
 * rAF latch. Scroll handlers are passive and can fire far more often than
 * the display refreshes; this guarantees at most one layout read per frame.
 */
export function scheduleFrame(fn: () => void): () => void {
	if (!browser) return () => {};
	let queued = false;
	const handler = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			fn();
		});
	};
	return handler;
}