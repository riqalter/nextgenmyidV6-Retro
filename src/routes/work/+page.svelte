<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import { featured, sections } from '$lib/content';
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import AccountCard from '$lib/components/AccountCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The CV highlights lead; the live repositories follow. On an offline
	// build the second window simply does not exist — the first still stands.
	const all = $derived([...featured, ...data.projects]);
	const total = $derived(all.length);
	const technologies = $derived(new Set(all.flatMap((p) => p.stack)).size);
</script>

<svelte:head>
	<title>Work — Mikail Thoriq</title>
	<meta
		name="description"
		content="Selected projects and repositories by Mikail Thoriq — AI/ML, backend and full-stack work."
	/>
</svelte:head>

<section class="section">
	<SectionHead
		kicker={sections.work.kicker}
		title={sections.work.title}
		sub={sections.work.sub}
	/>

	<div use:zoom>
		<Window title="Work — Finder">
			{#snippet children()}
				<p class="finder-info">
					<span>{total} items</span>
					<span>{technologies} technologies</span>
					<span>sorted by last push</span>
				</p>

				<div class="finder-grid">
					{#each featured as project (project.slug)}
						<FileCard {project} />
					{/each}
				</div>

				<p class="finder-status">
					<span class="finder-status-label"
						>● {featured.length} selected from the CV</span
					>
				</p>
			{/snippet}
		</Window>
	</div>
</section>

{#if data.accounts.length}
	<section class="section">
		<SectionHead kicker="02.1" title="Accounts" sub="where the code lives" />

		<div class="account-grid" use:zoom>
			{#each data.accounts as account (account.login)}
				<AccountCard {account} />
			{/each}
		</div>
	</section>
{/if}

<section class="section">
	<SectionHead kicker="02.2" title="Repositories" sub="pulled from the GitHub API" />

	{#if data.ok}
		<div use:zoom>
			<Window title="GitHub — all repositories">
				{#snippet children()}
					<p class="finder-info">
						<span>{data.projects.length} repositories</span>
						<span>non-fork · not archived</span>
						<span>fetched {data.fetchedAt}</span>
					</p>

					{#if data.error}
						<p class="stale-note">
							Live fetch failed at build time, so this is the last cached copy.
						</p>
					{/if}

					<div class="finder-grid">
						{#each data.projects as project (project.slug)}
							<FileCard {project} />
						{/each}
					</div>

					<p class="finder-status">
						<span class="finder-status-label"
							>● {data.projects.length} of {data.projects.length} selected</span
						>
					</p>
				{/snippet}
			</Window>
		</div>
	{:else}
		<div use:zoom>
			<Window title="GitHub — unavailable" dialog>
				{#snippet children()}
					<div class="prose">
						<p>
							The GitHub API could not be reached when this page was built, so the
							repository list is missing. The three projects above are written by hand
							and are always accurate.
						</p>
						{#if data.error}
							<p class="fetch-error">{data.error}</p>
						{/if}
						<p>
							<a class="btn btn--default" href="https://github.com/riqalter"
								>Open github.com/riqalter ↗</a
							>
						</p>
					</div>
				{/snippet}
			</Window>
		</div>
	{/if}
</section>

<style>
	/* Same recipe as .finder-grid, one column narrower so the three accounts
	   sit side by side on a desktop without the bio line wrapping too early. */
	.account-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: 1rem;
	}

	.fetch-error {
		font-family: var(--font-mono);
		font-size: 1.1rem;
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.stale-note {
		padding: 0.35rem 0.4rem;
		margin-top: 0.4rem;
		border: 1px dashed var(--red);
		font-family: var(--font-mono);
		font-size: 1.1rem;
		color: var(--red);
	}
</style>