<script lang="ts">
	import { icons } from '$lib/icons';
	import type { Account } from '$lib/server/github';

	let { account }: { account: Account } = $props();
</script>

<a
	class="account"
	href={account.url}
	rel="me noopener"
	target="_blank"
>
	<span class="account-icon" style="--icon: {icons.code}" aria-hidden="true"></span>

	<span class="account-name">{account.login}</span>
	<span class="account-kind">{account.type === 'Organization' ? 'organisation' : 'account'}</span>

	{#if account.bio}
		<p class="account-bio">{account.bio}</p>
	{/if}

	<dl class="info account-meta">
		<div>
			<dt>Repos</dt>
			<dd>{account.repos}</dd>
		</div>
		<div>
			<dt>Followers</dt>
			<dd>{account.followers}</dd>
		</div>
	</dl>
</a>

<style>
	.account {
		display: grid;
		gap: 0.5rem;
		justify-items: center;
		text-align: center;
		padding: 1.5rem 1rem 1.25rem;
		background: var(--paper);
		border: var(--line) solid var(--ink);
		box-shadow: var(--shadow);
		text-decoration: none;
	}

	.account:hover,
	.account:focus-visible {
		background: var(--ink);
		color: var(--paper);
	}

	.account:hover .account-icon,
	.account:focus-visible .account-icon {
		filter: invert(1) hue-rotate(180deg);
	}

	/* the meta rows keep their own rules on an inverted ground */
	.account:hover .account-meta,
	.account:focus-visible .account-meta {
		border-color: var(--paper);
	}

	.account:hover .account-meta > div,
	.account:focus-visible .account-meta > div {
		border-bottom-color: var(--paper);
	}

	.account-icon {
		width: 48px;
		height: 48px;
		background: var(--ink);
		mask-image: var(--icon);
		mask-size: contain;
		mask-repeat: no-repeat;
		-webkit-mask-image: var(--icon);
		-webkit-mask-size: contain;
		-webkit-mask-repeat: no-repeat;
	}

	.account:hover .account-icon,
	.account:focus-visible .account-icon {
		background: var(--paper);
	}

	.account-name {
		font-family: var(--font-ui);
		font-size: 1.2rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.account-kind {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		color: var(--muted);
	}

	.account:hover .account-kind,
	.account:focus-visible .account-kind {
		color: var(--paper);
	}

	.account-bio {
		font-size: 0.95rem;
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.account:hover .account-bio,
	.account:focus-visible .account-bio {
		color: var(--paper);
	}

	.account-meta {
		width: 100%;
		font-family: var(--font-mono);
		font-size: 1.1rem;
	}
</style>