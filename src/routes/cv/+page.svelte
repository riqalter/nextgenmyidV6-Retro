<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import {
		awards,
		certifications,
		copy,
		cvFile,
		education,
		identity,
		links,
		languages,
		roles,
		sections,
		stack
	} from '$lib/content';
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';
</script>

<svelte:head>
	<title>CV — Mikail Thoriq</title>
	<meta
		name="description"
		content="The long version — CV of Mikail Thoriq Banowo, AI/ML engineer, backend and full-stack developer."
	/>
</svelte:head>

<section class="section">
	<SectionHead kicker={sections.cv.kicker} title={sections.cv.title} sub={sections.cv.sub} />

	<div class="cv-actions" use:zoom={400}>
		<a class="btn btn--default" href={cvFile.href} download>Download the PDF</a>
		<button class="btn" type="button" onclick={() => window.print()}>Print this page</button>
	</div>
</section>

<section class="section">
	<div class="cv-doc" use:zoom>
		<Window title="Curriculum Vitae — {identity.fullName}">
			{#snippet children()}
				<header class="cv-head">
					<h1 class="cv-name">{identity.fullName}</h1>
					<p class="cv-title">{identity.title}</p>
					<ul class="cv-contact">
						<li>{identity.location}</li>
						<li>
							<a href="mailto:{identity.email}">{identity.email}</a>
						</li>
						{#each links as link (link.href)}
							<li>
								<a href={link.href} rel="me noopener" target="_blank"
									>{link.label} ↗</a
								>
							</li>
						{/each}
					</ul>
				</header>

				<section class="cv-block">
					<h2 class="cv-h">Professional Summary</h2>
					<div class="prose">
						<p>{copy.about}</p>
					</div>
				</section>

				<section class="cv-block">
					<h2 class="cv-h">Technical Skills</h2>
					<div class="stack-grid">
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

				<section class="cv-block">
					<h2 class="cv-h">Professional Experience</h2>
					{#each roles as role (role.title)}
						<article class="cv-role">
							<h3 class="cv-role-title">{role.title}</h3>
							<p class="cv-role-meta">
								<span>{role.org}</span>
								<span class="cv-role-period">{role.period}</span>
							</p>
							<p class="cv-role-place">{role.place}</p>
							<ul class="cv-bullets">
								{#each role.bullets as bullet (bullet)}
									<li>{bullet}</li>
								{/each}
							</ul>
						</article>
					{/each}
				</section>

				<section class="cv-block">
					<h2 class="cv-h">Education</h2>
					{#each education as item (item.org)}
						<article class="cv-role">
							<h3 class="cv-role-title">{item.degree}</h3>
							<p class="cv-role-meta">
								<span>{item.org}</span>
								<span class="cv-role-period">{item.period}</span>
							</p>
							<p class="cv-role-place">{item.note}</p>
						</article>
					{/each}
				</section>

				<section class="cv-block">
					<h2 class="cv-h">Certifications &amp; Training</h2>
					<ul class="cv-list">
						{#each certifications as cert (cert.title)}
							<li>
								<span class="cv-list-main">{cert.title}</span>
								<span class="cv-list-meta">{cert.issuer}{cert.year ? ` · ${cert.year}` : ''}</span>
							</li>
						{/each}
					</ul>
				</section>

				<section class="cv-block">
					<h2 class="cv-h">Awards &amp; Achievements</h2>
					<ul class="cv-list">
						{#each awards as award (award.title)}
							<li>
								<span class="cv-list-main">{award.title}</span>
								<span class="cv-list-meta"
									>{[award.org, award.year].filter(Boolean).join(' · ')}</span
								>
							</li>
						{/each}
					</ul>
				</section>

				<section class="cv-block">
					<h2 class="cv-h">Languages</h2>
					<dl class="info">
						{#each languages as [language, level] (language)}
							<div>
								<dt>{language}</dt>
								<dd>{level}</dd>
							</div>
						{/each}
					</dl>
				</section>
			{/snippet}
		</Window>
	</div>

	<p class="cv-foot">
		<a class="btn" href={cvFile.href} download>Download the PDF ({cvFile.label})</a>
	</p>
</section>

<style>
	.cv-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.cv-doc {
		max-width: 60rem;
	}

	.cv-head {
		padding-bottom: 1.25rem;
		border-bottom: var(--line) solid var(--ink);
	}

	.cv-name {
		font-size: clamp(1.9rem, 5vw, 2.75rem);
		line-height: 1;
	}

	.cv-title {
		margin-top: 0.35rem;
		font-family: var(--font-mono);
		font-size: 1.35rem;
		color: var(--red);
	}

	.cv-contact {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
		font-family: var(--font-mono);
		font-size: 1.15rem;
	}

	.cv-block {
		margin-top: 2.25rem;
	}

	/* The document's own sub-headings close with the same dithered rule the page
	   sections use — stripes behind type is a window-title trick, and it only
	   works when the label is a separate element punching out of them. */
	.cv-h {
		position: relative;
		padding-bottom: 0.75rem;
		margin-bottom: 1.25rem;
		font-size: 1.35rem;
		/* the global heading rule is line-height .95 — too tight once a rule
		   sits under the line, or the glyph descenders sit on the stripes */
		line-height: 1.15;
	}

	.cv-h::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 10px;
		background: var(--pat-50) 0 0 / 4px 4px;
		border-block: var(--line) solid var(--ink);
	}

	.cv-role + .cv-role {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px dashed var(--ink);
	}

	.cv-role-title {
		font-size: 1.25rem;
		line-height: 1.15;
	}

	.cv-role-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		margin-top: 0.2rem;
		font-family: var(--font-ui);
		font-size: 1rem;
	}

	.cv-role-period,
	.cv-role-place {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		color: var(--muted);
		white-space: nowrap;
	}

	.cv-role-place {
		margin-top: 0.1rem;
	}

	/* the ▸ marker is CSS, so the list reads as an ordered record */
	.cv-bullets {
		margin: 0.6rem 0 0;
		padding: 0;
		list-style: none;
		max-width: 72ch;
	}

	.cv-bullets li {
		position: relative;
		padding-left: 1.1em;
		color: var(--muted);
	}

	.cv-bullets li + li {
		margin-top: 0.35rem;
	}

	.cv-bullets li::before {
		content: '▸';
		position: absolute;
		left: 0;
		color: var(--red);
	}

	.cv-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cv-list li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.2rem 1rem;
		padding: 0.45rem 0;
		border-bottom: 1px dashed var(--ink);
	}

	.cv-list-main {
		flex: 1 1 20rem;
	}

	.cv-list-meta {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		color: var(--muted);
		text-align: right;
	}

	.cv-foot {
		max-width: 60rem;
		margin-top: 1.5rem;
	}

	/* Printing the page IS the point of this route: strip the machine chrome
	   and let the document be the document. */
	@media print {
		.cv-actions,
		.cv-foot {
			display: none;
		}

		.cv-doc {
			max-width: none;
			box-shadow: none;
		}
	}
</style>