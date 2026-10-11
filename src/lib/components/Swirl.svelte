<script lang="ts">
	import { motion, onMotionChange } from '$lib/motion.svelte';
	import { onThemeChange, token } from '$lib/theme.svelte';

	interface Sprite {
		cnv: HTMLCanvasElement;
		red: boolean;
		a: number;
		w: number;
		r: number;
		delay: number;
		wobble: number;
		order: number;
	}

	let canvas = $state<HTMLCanvasElement | undefined>();

	interface Props {
		/** the element the field orbits — measured, never queried */
		host?: HTMLElement;
	}
	let { host }: Props = $props();

	/** one swirl pixel = 2 CSS px; the canvas stays a fraction of the hero's size */
	const PX = 2;
	const CHARS = '*+#%&@$=/\\|<>{}[]01;:~^?!MKAI'.split('');
	const REDS = ['*', '+', '#'];

	/* Canvas cannot read CSS variables, so the inks are resolved from the
	   computed styles and the whole sprite sheet is rebuilt when the theme
	   changes. Without this the field stays black-on-black in dark mode. */
	let INK = '#1c1a17';
	let ACCENT = '#c8102e';

	/* deterministic PRNG — a resize must not reshuffle the composition */
	let seed = 20261010;
	const rnd = () => {
		seed = (seed * 16807) % 2147483647;
		return (seed - 1) / 2147483646;
	};

	/** hard 1-bit mask: a glyph is never anti-aliased greys */
	function threshold(c: HTMLCanvasElement) {
		const ctx = c.getContext('2d')!;
		const img = ctx.getImageData(0, 0, c.width, c.height);
		const d = img.data;
		for (let i = 0; i < d.length; i += 4) d[i + 3] = d[i + 3] > 110 ? 255 : 0;
		ctx.putImageData(img, 0, 0);
		return c;
	}

	function charSprite(ch: string, colour: string): HTMLCanvasElement {
		const c = document.createElement('canvas');
		c.width = c.height = 16;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = colour;
		ctx.font = '16px VT323, monospace';
		ctx.textBaseline = 'top';
		ctx.fillText(ch, 0, 0);
		return threshold(c);
	}

	/** icons drawn as 1-bit primitives, 16×16, no antialiasing */
	function iconSprite(draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
		const c = document.createElement('canvas');
		c.width = c.height = 16;
		const ctx = c.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;
		draw(ctx);
		return threshold(c);
	}

	const line = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
		ctx.fillStyle = INK;
		ctx.fillRect(x, y, 1, 1);
	};

	const ICONS = [
		// mail
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.lineWidth = 1;
			ctx.strokeRect(2.5, 4.5, 11, 7);
			for (let i = 0; i < 6; i++) line(ctx, 3 + i * 1.6, 5 + i * 1.2);
			for (let i = 0; i < 6; i++) line(ctx, 12 - i * 1.6, 5 + i * 1.2);
		},
		// code
		(ctx: CanvasRenderingContext2D) => {
			for (let i = 0; i < 4; i++) {
				line(ctx, 5 - i, 5 + i);
				line(ctx, 5 - i, 11 - i);
				line(ctx, 10 + i, 5 + i);
				line(ctx, 10 + i, 11 - i);
			}
		},
		// monitor
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.strokeRect(1.5, 3.5, 13, 8);
			for (let x = 6; x < 10; x++) line(ctx, x, 12);
			for (let x = 4; x < 12; x++) line(ctx, x, 13);
		},
		// film
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.strokeRect(3.5, 2.5, 9, 11);
			for (let y = 4; y < 12; y += 3) {
				line(ctx, 5, y);
				line(ctx, 10, y);
			}
		},
		// camera
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.strokeRect(2.5, 5.5, 11, 7);
			ctx.strokeRect(5.5, 2.5, 4, 3);
			ctx.beginPath();
			ctx.arc(8, 9, 2.5, 0, Math.PI * 2);
			ctx.stroke();
		},
		// terminal
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.strokeRect(1.5, 2.5, 13, 11);
			for (let i = 0; i < 3; i++) {
				line(ctx, 4 + i * 1.5, 6 + i);
				line(ctx, 4 + i * 1.5, 10 - i);
			}
			for (let x = 9; x < 13; x++) line(ctx, x, 9);
		},
		// folder
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.strokeRect(2.5, 4.5, 11, 8);
			for (let x = 2; x < 7; x++) line(ctx, x, 4);
			for (let x = 2; x < 7; x++) line(ctx, x, 3);
		},
		// prism
		(ctx: CanvasRenderingContext2D) => {
			ctx.strokeStyle = INK;
			ctx.beginPath();
			ctx.moveTo(8, 2);
			ctx.lineTo(14, 13);
			ctx.lineTo(2, 13);
			ctx.closePath();
			ctx.stroke();
			for (let i = 0; i < 6; i++) line(ctx, 5 + i, 9 + i * 0.5);
		}
	];

	$effect(() => {
		if (!canvas || !host) return;
		const context = canvas.getContext('2d', { alpha: true });
		if (!context) return;
		const ctx: CanvasRenderingContext2D = context;

		let raf = 0;
		let running = false;
		let visible = false;
		let sprites: Sprite[] = [];
		let W = 0;
		let H = 0;
		let R = 0;
		let start = performance.now();

		function build() {
			INK = token('--ink', '#1c1a17');
			ACCENT = token('--red', '#c8102e');

			const rect = host!.getBoundingClientRect();
			W = Math.max(1, Math.round(rect.width / PX));
			H = Math.max(1, Math.round(rect.height / PX));
			canvas!.width = W;
			canvas!.height = H;
			canvas!.style.width = `${rect.width}px`;
			canvas!.style.height = `${rect.height}px`;

			R = Math.max(W, H) * 0.62;

			const chars = CHARS.map((ch) => charSprite(ch, INK));
			const reds = REDS.map((ch) => charSprite(ch, ACCENT));
			const icons = ICONS.map(iconSprite);

			const area = Math.PI * R * R;
			// deliberately sparse: the field is a background, not a texture.
			// overfill it and the hero copy stops being readable.
			const count = Math.round(Math.min(110, Math.max(36, area / 2600)));

			sprites = Array.from({ length: count }, () => {
				// exponent < 1 biases outward, and the inner bound leaves a
				// genuinely clear centre for the type to sit in
				const r = R * (0.42 + 0.58 * Math.pow(rnd(), 0.7));
				const roll = rnd();
				// red is rationed at ~6%, exactly as in the chrome
				const pool = roll < 0.1 ? icons : roll < 0.16 ? reds : chars;
				return {
					cnv: pool[Math.floor(rnd() * pool.length)],
					red: roll >= 0.1 && roll < 0.16,
					a: rnd() * Math.PI * 2,
					// every particle shares sqrt(R/r): inner ones sweep faster,
					// and the field reads as differential rotation
					w: (0.06 + rnd() * 0.05) * Math.sqrt(R / r) * (rnd() > 0.5 ? 1 : -1),
					r,
					delay: rnd() * 1.6,
					wobble: rnd() * Math.PI * 2,
					order: (rnd() * 1000) | 0
				};
			});
		}

		const easeOutCubic = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

		function render(now: number) {
			const t = (now - start) / 1000;
			const intro = Math.min(1.6, t);
			const scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));

			ctx.clearRect(0, 0, W, H);
			// On a wide hero the copy is left-aligned, so the field sits to the
			// right of it rather than fighting it. Narrow viewports centre.
			const wide = W > H * 1.3;
			const cx = W * (wide ? 0.7 : 0.5);
			const cy = H * (wide ? 0.5 : 0.42);

			// 1-bit dissolve: sprites are removed one at a time in a scattered
			// order rather than alpha-faded, so the field disintegrates
			const keep = Math.round((1 - scroll) * 1000);

			for (const p of sprites) {
				if (p.order > keep) continue;
				const k = easeOutCubic((intro - p.delay) / 1.6);
				const spread = 1 + (1 - k) * 1.8 + scroll * 1.6;
				const a = p.a + p.w * t + (1 - k) * 2.2 * Math.sign(p.w);
				const r = p.r * spread * (1 + 0.04 * Math.sin(t * 0.7 + p.wobble));
				const x = Math.round(cx + Math.cos(a) * r);
				const y = Math.round(cy + Math.sin(a) * r * 0.62);
				if (x < -16 || y < -16 || x > W + 16 || y > H + 16) continue;
				ctx.drawImage(p.cnv, x, y);
			}
		}

		function loop(now: number) {
			render(now);
			raf = requestAnimationFrame(loop);
		}

		function update() {
			const shouldRun = motion.enabled && visible && !document.hidden;
			if (shouldRun && !running) {
				running = true;
				raf = requestAnimationFrame(loop);
			} else if (!shouldRun && running) {
				running = false;
				cancelAnimationFrame(raf);
				raf = 0;
			}
			if (!motion.enabled) render(start);
		}

		document.fonts.ready.then(() => {
			build();
			update();
		});

		const io = new IntersectionObserver(
			([e]) => {
				visible = e.isIntersecting;
				update();
			},
			{ threshold: 0 }
		);
		io.observe(host);

		const ro = new ResizeObserver(() => {
			build();
			render(performance.now());
		});
		ro.observe(host);

		const onVis = () => update();
		document.addEventListener('visibilitychange', onVis);

		const onScroll = () => update();
		window.addEventListener('scroll', onScroll, { passive: true });

		// re-enabling motion must not replay the intro
		const off = onMotionChange(() => {
			if (motion.enabled) start = performance.now() - 2200;
			update();
		});

		// the sprite sheet is baked in the theme's inks, so a switch means
		// re-baking every glyph — not just repainting the old black masks
		const offTheme = onThemeChange(() => {
			build();
			render(performance.now());
		});

		return () => {
			io.disconnect();
			ro.disconnect();
			off();
			offTheme();
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(raf);
		};
	});
</script>

<canvas bind:this={canvas} class="swirl" aria-hidden="true"></canvas>

<style>
	.swirl {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		/* the field is a hard 1-bit mask drawn small and scaled up */
		image-rendering: pixelated;
		pointer-events: none;
		z-index: 0;
	}
</style>