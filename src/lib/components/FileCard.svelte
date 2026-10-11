<script lang="ts">
	import { icons } from '$lib/icons';
	import type { Project } from '$lib/content';

	let { project }: { project: Project } = $props();

	const href = $derived(project.href ?? project.repo ?? '#');
	const external = $derived(Boolean(project.href ?? project.repo));
</script>

<article class="file">
	<a class="file-link" {href} target={external ? '_blank' : undefined} rel={external ? 'noopener' : undefined}>
		<span
			class="file-icon"
			style="--icon: {icons[project.icon]}"
			aria-hidden="true"
		></span>
		<span class="file-name">{project.name}</span>
	</a>
	{#if project.blurb}
		<p class="file-blurb">{project.blurb}</p>
	{/if}
	<dl class="info file-meta">
		<div>
			<dt>Kind</dt>
			<dd>{project.kind}</dd>
		</div>
		<div>
			<dt>Year</dt>
			<dd>{project.year}</dd>
		</div>
		{#if project.stars}
			<div>
				<dt>Stars</dt>
				<dd>{project.stars} ★</dd>
			</div>
		{/if}
	</dl>
	<ul class="file-stack">
		{#each project.stack as item (item)}
			<li>{item}</li>
		{/each}
	</ul>
</article>

<style>
	.file {
		position: relative;
		display: grid;
		gap: 0.5rem;
		justify-items: center;
		text-align: center;
		padding: 1.25rem 0.75rem 1rem;
	}

	.file-link {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		text-decoration: none;
	}

	.file-icon {
		width: 56px;
		height: 56px;
		background: var(--ink);
		mask-image: var(--icon);
		mask-size: contain;
		mask-repeat: no-repeat;
		-webkit-mask-image: var(--icon);
		-webkit-mask-size: contain;
		-webkit-mask-repeat: no-repeat;
	}

	/* black stays black, white becomes black, red becomes cyan — one filter,
	   no asset swap. */
	.file:hover .file-icon,
	.file:focus-within .file-icon {
		filter: invert(1) hue-rotate(180deg);
	}

	.file-name {
		font-family: var(--font-ui);
		font-weight: 500;
		font-size: 1.15rem;
		line-height: 1.25;
	}

	/* the external-link marker is one of the few permitted red marks */
	.file-link[target='_blank'] .file-name::before {
		content: '↗ ';
		color: var(--red);
	}

	.file-blurb {
		font-size: 0.95rem;
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.file-meta {
		width: 100%;
		font-family: var(--font-mono);
		font-size: 1.05rem;
	}

	.file-meta dt {
		font-family: var(--font-mono);
		font-weight: 400;
	}

	.file-stack {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35rem;
		list-style: none;
		padding: 0;
	}

	.file-stack li {
		padding: 0.1rem 0.45rem;
		border: 1px solid var(--ink);
		font-family: var(--font-mono);
		font-size: 1.05rem;
	}

	/* the whole card is the hit target */
	.file-link::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	/* one visible focus target, not two nested ones */
	.file:focus-within {
		outline: 3px solid var(--red);
		outline-offset: 10px;
	}

	.file:focus-within .file-link {
		outline: none;
	}
</style>