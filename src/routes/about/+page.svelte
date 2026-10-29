<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import {
		copy,
		experience,
		facts,
		identity,
		sections,
		stack,
		education,
		certifications
	} from '$lib/content';
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';
</script>

<svelte:head>
	<title>About — Mikail Thoriq</title>
</svelte:head>

<section class="section">
	<SectionHead level={1} kicker={sections.about.kicker} title={sections.about.title} sub={sections.about.sub} />

	<div use:zoom>
		<Window title="About — {identity.name}">
			{#snippet children()}
				<div class="about-body">
					<dl class="info">
						{#each facts as [term, value] (term)}
							<div>
								<dt>{term}</dt>
								<dd>{value}</dd>
							</div>
						{/each}
					</dl>

					<div class="prose">
						<p>{copy.about}</p>
					</div>
				</div>
			{/snippet}
		</Window>
	</div>
</section>

<section class="section">
	<SectionHead kicker="01.1" title="Experience" sub="where I have been" />

	<div class="jobs" use:zoom>
		{#each experience as job (job.role + job.org)}
			<article class="job">
				<h3>{job.role}</h3>
				<p class="job-period">{job.period}</p>
				<p class="job-org">{job.org}</p>
				<p class="job-note">{job.note}</p>
			</article>
		{/each}
	</div>

	<p style="margin-top: 1.5rem">
		<a class="btn" href="/cv">Read the full CV</a>
	</p>
</section>

<section class="section">
	<SectionHead kicker={sections.stack.kicker} title={sections.stack.title} sub={sections.stack.sub} />

	<div class="stack-grid" use:zoom>
		{#each stack as group (group.group)}
			<div class="stack-group">
				<h3>{group.group}</h3>
				<ul>
					{#each group.items as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>

<section class="section">
	<SectionHead kicker="03.1" title="Education" sub="where it started" />

	<div class="jobs" use:zoom>
		{#each education as item (item.org)}
			<article class="job">
				<h3>{item.degree}</h3>
				<p class="job-period">{item.period}</p>
				<p class="job-org">{item.org}</p>
				<p class="job-note">{item.note}</p>
			</article>
		{/each}
	</div>
</section>

<section class="section">
	<SectionHead kicker="03.2" title="Certifications" sub="what I have taken" />

	<div class="jobs" use:zoom>
		{#each certifications as cert (cert.title)}
			<article class="job">
				<h3>{cert.title}</h3>
				{#if cert.year}<p class="job-period">{cert.year}</p>{/if}
				<p class="job-org">{cert.issuer}</p>
			</article>
		{/each}
	</div>
</section>
