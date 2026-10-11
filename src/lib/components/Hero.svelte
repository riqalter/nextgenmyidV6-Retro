<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import { copy, identity } from '$lib/content';
	import Swirl from './Swirl.svelte';
	import Typewriter from './Typewriter.svelte';

	let hero = $state<HTMLElement>();
</script>

<section class="hero" bind:this={hero}>
	<Swirl host={hero} />

	<div class="hero-inner">
		<p class="hero-kicker">
			<span class="hero-prompt-mark" aria-hidden="true">&gt;</span>
			{identity.location}
		</p>

		<h1 class="hero-title">Mikail<br />Thoriq</h1>

		<Typewriter phrases={identity.roles} sentence={identity.rolesSentence} />

		<p class="hero-lead">{copy.heroLead}</p>

		<div class="hero-actions" use:zoom={600}>
			<a class="btn btn--default" href="/work">See the work</a>
			<a class="btn" href="/contact">Get in touch</a>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		display: grid;
		align-content: center;
		min-height: calc(100svh - var(--menubar-h));
		padding: clamp(3rem, 8vw, 6rem) var(--gutter);
		overflow: hidden;
		/* the swirl paints its own paper behind the type */
		background: var(--paper);
		isolation: isolate;
	}

	.hero-inner {
		position: relative;
		z-index: 1;
		max-width: var(--measure);
		margin-inline: auto;
		width: 100%;
		display: grid;
		gap: 1.1rem;
		justify-items: start;
	}

	.hero-kicker {
		font-family: var(--font-mono);
		font-size: 1.4rem;
	}

	.hero-prompt-mark {
		color: var(--red);
	}

	.hero-title {
		font-size: clamp(2.6rem, 9vw, 4.5rem);
		line-height: 0.95;
		letter-spacing: -0.01em;
	}

	.hero-lead {
		max-width: 46ch;
		color: var(--muted);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
</style>