<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import { copy, facts, links, projects, sections, stack } from '$lib/content';
	import Hero from '$lib/components/Hero.svelte';
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
</script>

<svelte:head>
	<meta property="og:title" content="Mikail Thoriq" />
	<meta property="og:description" content={copy.heroLead} />
</svelte:head>

<Hero />

<section class="section" id="about">
	<SectionHead kicker={sections.about.kicker} title={sections.about.title} sub={sections.about.sub} />

	<div use:zoom>
		<Window title="Mikail Thoriq — About">
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

<section class="section" id="work">
	<SectionHead kicker={sections.work.kicker} title={sections.work.title} sub={sections.work.sub} />

	<div use:zoom>
		<Window title="Work — Finder">
			{#snippet children()}
				<p class="finder-info">
					<span>{projects.length} items</span>
					<span>selected projects</span>
				</p>

				<div class="finder-grid">
					{#each projects as project (project.slug)}
						<FileCard {project} />
					{/each}
				</div>

				<p class="finder-status">
					<span class="finder-status-label">● {projects.length} of {projects.length} selected</span>
				</p>
			{/snippet}
		</Window>
	</div>

	<p style="margin-top: 1.5rem">
		<a class="btn" href="/work">Open the full window</a>
	</p>
</section>

<section class="section" id="stack">
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

<section class="section" id="cv">
	<SectionHead kicker={sections.cv.kicker} title={sections.cv.title} sub={sections.cv.sub} />

	<div use:zoom>
		<Window title="CV — Curriculum Vitae">
			{#snippet children()}
				<div class="prose">
					<p>{copy.cvLead}</p>
					<p>
						<a class="btn btn--default" href="/cv">Open the CV</a>
					</p>
				</div>
			{/snippet}
		</Window>
	</div>
</section>

<section class="section" id="contact">
	<SectionHead
		kicker={sections.contact.kicker}
		title={sections.contact.title}
		sub={sections.contact.sub}
	/>

	<div use:zoom>
		<Window title="Contact" dialog>
			{#snippet children()}
				<div class="contact-body">
					<div class="prose">
						<p>{copy.contactLead}</p>
						<p>
							<a class="btn btn--default" href="/contact">Open the contact window</a>
						</p>
					</div>
					<dl class="info">
						{#each links as link (link.href)}
							<div>
								<dt>{link.label}</dt>
								<dd><a href={link.href} rel="me noopener" target="_blank">↗ open</a></dd>
							</div>
						{/each}
					</dl>
				</div>
			{/snippet}
		</Window>
	</div>
</section>