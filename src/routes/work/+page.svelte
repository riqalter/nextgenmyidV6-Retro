<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import { accounts, featured, sections } from '$lib/content';
	import { repositoryStatus } from '$lib/github-status';
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import AccountCard from '$lib/components/AccountCard.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Work — Mikail Thoriq</title></svelte:head>

<section class="section">
	<SectionHead level={1} kicker={sections.work.kicker} title={sections.work.title} sub="three projects, from problem to implementation" />
	<div use:zoom>
		<Window title="Selected work — Finder">
			{#snippet children()}
				<p class="finder-info"><span>{featured.length} featured projects</span><span>research · product · computer vision</span></p>
				<div class="finder-grid featured-grid">
					{#each featured as project (project.slug)}<FileCard {project} />{/each}
				</div>
				<p class="finder-status"><span class="finder-status-label">Read the problem, my role and the evidence</span></p>
			{/snippet}
		</Window>
	</div>
</section>

<section class="section">
	<SectionHead kicker="02.1" title="Repository archive" sub="experiments and other source code" />
	<p class="snapshot-note">{repositoryStatus(data)}</p>
	<p class="snapshot-note">This list is saved when the site is built. It updates with the next deployment.</p>
	<details class="archive">
		<summary>Browse recent repositories ({data.projects.length})</summary>
		{#if data.accounts.length}
			<div class="account-grid">
				{#each data.accounts as account (account.login)}<AccountCard {account} />{/each}
			</div>
		{/if}
		{#if data.status !== 'unavailable'}
			<Window title="GitHub — recent repositories">
				{#snippet children()}
					<p class="finder-info">
						<span>{data.projects.length} repositories</span><span>snapshot {data.fetchedAt.slice(0, 10)} UTC</span>
					</p>
					<p class="archive-scope">Up to 18 non-fork, non-archived repositories per account, from its first 100 results. Featured work is excluded. Ordered by last push.</p>
					{#if data.status === 'partial'}<p class="archive-scope">Missing accounts: {data.failedAccounts.join(', ')}.</p>{/if}
					<div class="finder-grid">
						{#each data.projects as project (project.slug)}<FileCard {project} />{/each}
					</div>
					{#if !data.projects.length}<p>No recent repositories in this snapshot. Explore the accounts below.</p>{/if}
					<p class="finder-status"><span class="finder-status-label">{data.projects.length} source repositories shown</span></p>
				{/snippet}
			</Window>
		{/if}
		<p class="all-repos">Explore each full archive on GitHub:</p>
		<ul class="account-links">
			{#each accounts as account}<li><a href="https://github.com/{account.login}?tab=repositories" target="_blank" rel="noopener">{account.login}</a></li>{/each}
		</ul>
	</details>
</section>

<style>
	.snapshot-note { max-width: 72ch; margin-bottom: 0.75rem; }
	.archive { margin-top: 1.5rem; }
	.archive summary { cursor: pointer; font-family: var(--font-ui); font-size: 1.2rem; padding-block: 1rem; border-block: var(--line) solid var(--ink); }
	.archive summary:hover { color: var(--red); }
	.account-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; margin-block: 2rem; }
	.archive-scope { margin-block: 1rem; max-width: 72ch; color: var(--muted); }
	.all-repos { margin-top: 2rem; }
	.account-links { display: flex; flex-wrap: wrap; gap: 0.5rem 2rem; padding-left: 1.25rem; margin-top: 0.5rem; }
</style>
