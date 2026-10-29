<script lang="ts">
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.project.name} — Mikail Thoriq</title></svelte:head>

<article class="section case-study">
	<p class="back"><a href="/work/">Back to selected work</a></p>
	<SectionHead kicker="02" title={data.project.name} sub={data.project.kind + ' · ' + data.project.year} level={1} />
	<Window title="{data.project.name} — case study">
		{#snippet children()}
			<div class="story">
				<p class="role"><strong>My role</strong><br />{data.study.role}</p>
				<section><h2>The problem</h2><p>{data.study.problem}</p></section>
				<section><h2>The constraints</h2><p>{data.study.constraints}</p></section>
				<section><h2>Approach and tradeoff</h2><p>{data.study.decision}</p></section>
				<figure>
					<ol class="pipeline" aria-label="Project workflow">
						{#each data.study.steps as step}<li>{step}</li>{/each}
					</ol>
					<figcaption>{data.study.caption}</figcaption>
				</figure>
				<section><h2>The result</h2><p>{data.study.result}</p></section>
				<section>
					<h2>Inspect the evidence</h2>
					<ul class="evidence">
						{#each data.study.evidence as item}
							<li><a href={item.href}>{item.title}</a><p>{item.detail}</p></li>
						{/each}
					</ul>
				</section>
				<div class="project-actions">
					{#if data.project.repo}<a class="btn" href={data.project.repo} target="_blank" rel="noopener">View source</a>{/if}
					{#if data.project.href}<a class="btn" href={data.project.href} target="_blank" rel="noopener">Open product</a>{/if}
					<a class="btn btn--default" href="/contact/">Discuss a project</a>
				</div>
			</div>
		{/snippet}
	</Window>
</article>

<style>
	.back { margin-bottom: 1.5rem; }
	.story { max-width: 72ch; margin-inline: auto; padding: clamp(0.25rem, 2vw, 1rem); }
	.story section, .story figure { margin-top: 2.5rem; }
	.story h2 { font-size: clamp(1.5rem, 4vw, 2rem); margin-bottom: 0.6rem; }
	.story p { overflow-wrap: anywhere; }
	.role { padding-bottom: 1.5rem; border-bottom: 1px dashed var(--ink); }
	.pipeline { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 0; list-style-position: inside; border: var(--line) solid var(--ink); }
	.pipeline li { padding: 1rem; font-family: var(--font-ui); }
	.pipeline li + li { border-left: 1px dashed var(--ink); }
	figcaption { margin-top: 0.75rem; color: var(--muted); font-size: 0.95rem; }
	.evidence { padding-left: 1.25rem; }
	.evidence li + li { margin-top: 1rem; }
	.project-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 2rem; }
	@media (max-width: 600px) {
		.pipeline { grid-template-columns: minmax(0, 1fr); }
		.pipeline li + li { border-left: 0; border-top: 1px dashed var(--ink); }
	}
</style>
