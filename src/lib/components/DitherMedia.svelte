<script lang="ts">
	import { DitherRenderer } from '$lib/gl/dither';
	import { motion, onMotionChange } from '$lib/motion.svelte';
	import { onThemeChange, token } from '$lib/theme.svelte';

	interface Props {
		src: string;
		alt?: string;
		/** short caption printed on the dithered frame */
		label?: string;
		contrast?: number;
		class?: string;
	}

	let { src, alt = '', label = 'Show in colour', contrast = 1.7, class: klass = '' }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>();
	let figure = $state<HTMLElement | undefined>();
	let hasGl = $state(false);
	/** explicit toggle — the touch and keyboard affordance. hover is the bonus. */
	let forced = $state(false);

	let renderer: DitherRenderer | null = null;
	let mix = 0;
	let raf = 0;
	let visible = false;

	const canHover = () => matchMedia('(hover: hover)').matches;
	const hovered = () => canHover() && (figure?.matches(':hover') ?? false);

	function target(): number {
		if (forced || hovered()) return 1;
		if (!canHover()) {
			// touch has no hover — "am I being looked at" becomes "am I centred"
			const r = figure?.getBoundingClientRect();
			if (!r) return 0;
			const mid = (r.top + r.height / 2) / window.innerHeight;
			return Math.abs(mid - 0.5) < 0.2 ? 1 : 0;
		}
		return 0;
	}

	function frame(now: number) {
		if (!renderer || !canvas || !figure) return;
		const t = target();

		if (!motion.enabled) {
			// one static frame, then stop — never a spinning loop for nobody
			mix = t;
			renderer.draw(mix);
			raf = 0;
			return;
		}

		mix += (t - mix) * 0.18;
		if (Math.abs(t - mix) < 0.004) {
			mix = t;
			renderer.draw(mix);
			raf = 0;
			return;
		}
		renderer.draw(mix);
		raf = requestAnimationFrame(frame);
		void now;
	}

	function kick() {
		if (raf || !visible || !motion.enabled) return;
		raf = requestAnimationFrame(frame);
	}

	function onMotion() {
		if (motion.enabled) kick();
		else if (renderer) renderer.draw(target());
	}

	$effect(() => {
		if (!canvas || !figure) return;
		const r = new DitherRenderer(canvas, { contrast });
		if (r.ok) {
			renderer = r;
			hasGl = true;
		}
		// the threshold resolves into the current theme's two inks
		r.setPalette(token('--ink', '#1c1a17'), token('--paper', '#f5f2ea'));
		r.resize(figure.clientWidth, figure.clientHeight);

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			r.upload(img);
			r.draw(target());
		};
		img.src = src;

		const ro = new ResizeObserver(() => {
			r.resize(figure!.clientWidth, figure!.clientHeight);
			r.draw(target());
		});
		ro.observe(figure);

		const io = new IntersectionObserver(
			([e]) => {
				visible = e.isIntersecting;
				if (visible) kick();
			},
			{ rootMargin: '200px 0px' }
		);
		io.observe(figure);

		// hover has to poke the loop — no frame is guaranteed to be imminent
		figure.addEventListener('pointerenter', kick);
		figure.addEventListener('pointerleave', kick);
		const off = onMotionChange(onMotion);

		// a theme switch changes which two inks the dither resolves between
		const offTheme = onThemeChange(() => {
			r.setPalette(token('--ink', '#1c1a17'), token('--paper', '#f5f2ea'));
			r.draw(target());
		});

		const onLost = (e: Event) => {
			e.preventDefault();
			r.destroy();
			renderer = null;
			hasGl = false;
		};
		canvas.addEventListener('webglcontextlost', onLost);

		return () => {
			ro.disconnect();
			io.disconnect();
			off();
			offTheme();
			cancelAnimationFrame(raf);
			r.destroy();
		};
	});
</script>

<figure class="dither-media {klass}" bind:this={figure}>
	<img {src} {alt} />
	<canvas bind:this={canvas} class:shown={hasGl} aria-hidden="true"></canvas>

	<span class="dither-tag" aria-hidden="true">{label}</span>

	<button
		type="button"
		class="btn btn--small dither-toggle"
		aria-pressed={forced}
		onclick={() => {
			forced = !forced;
			kick();
		}}
	>
		{forced ? 'Show 1-bit' : 'Show in colour'}
	</button>
</figure>

<style>
	.dither-media {
		position: relative;
		margin: 0;
		border: var(--line) solid var(--ink);
		background: var(--paper);
		overflow: hidden;
		/* hard pixel grid — the 1-bit output has to stay sharp */
		image-rendering: pixelated;
	}

	.dither-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* the fallback is always in the DOM: no WebGL is a state, not an error */
	}

	.dither-media canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: none;
	}

	.dither-media canvas.shown {
		display: block;
	}

	.dither-tag {
		position: absolute;
		left: 0;
		bottom: 0;
		padding: 0 0.5em;
		background: var(--paper);
		border-top: var(--line) solid var(--ink);
		border-right: var(--line) solid var(--ink);
		font-family: var(--font-mono);
		font-size: 1.15rem;
		pointer-events: none;
	}

	.dither-toggle {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
	}

	@media (hover: hover) {
		/* hover alone is enough for a fine pointer — the button is the
		   keyboard and touch route to the same state */
		.dither-media:hover .dither-toggle {
			opacity: 0;
		}
	}
</style>