<script lang="ts">
	import { motion, onMotionChange } from '$lib/motion.svelte';

	interface Props {
		phrases: string[];
		/** the full sentence screen readers get instead */
		sentence: string;
	}

	let { phrases, sentence }: Props = $props();

	let text = $state('');
	/** red prompt caret — machine telemetry, not decoration */
	let caret = $state(true);

	$effect(() => {
		if (!motion.enabled) {
			text = phrases[0] ?? '';
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let phrase = 0;
		let char = 0;
		let deleting = false;
		let cancelled = false;

		function tick() {
			if (cancelled) return;
			const current = phrases[phrase % phrases.length];

			if (!deleting && char === current.length) {
				deleting = true;
				timer = setTimeout(tick, 1900); // the hold
				return;
			}
			if (deleting && char === 0) {
				deleting = false;
				phrase++;
				timer = setTimeout(tick, 350);
				return;
			}

			char += deleting ? -1 : 1;
			text = current.slice(0, char);

			// Asymmetric delay: a fixed typing cadence reads as a machine.
			// Humanise the type, keep the delete mechanical.
			const delay = deleting ? 45 : 85 + Math.random() * 40;
			timer = setTimeout(tick, delay);
		}

		// wait for the hero to settle before the machine starts talking
		timer = setTimeout(tick, 2200);

		const off = onMotionChange(() => {
			cancelled = true;
			clearTimeout(timer);
		});

		return () => {
			cancelled = true;
			clearTimeout(timer);
			off();
		};
	});
</script>

<p class="hero-role">
	<span class="hero-prompt" aria-hidden="true">&gt;</span>
	<span class="hero-typed" aria-hidden="true">{text}</span>
	{#if caret}
		<span class="cursor" aria-hidden="true"></span>
	{/if}
	<span class="sr-only">{sentence}</span>
</p>

<style>
	.hero-role {
		display: flex;
		align-items: center;
		gap: 0.5ch;
		/* reserve the height, or the window jumps when a phrase wraps */
		min-height: 1em;
		font-family: var(--font-mono);
		font-size: 1.6rem;
		line-height: 1;
	}

	.hero-prompt {
		color: var(--red);
		flex-shrink: 0;
	}

	.cursor {
		width: 0.6ch;
		height: 1em;
		background: var(--red);
		flex-shrink: 0;
		animation: mt-blink 1.06s steps(1) infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.cursor {
			animation: none;
		}
	}
</style>