<script lang="ts">
	interface Props {
		/** section number — set in red, the "you are here" mark */
		kicker: string;
		title: string;
		sub?: string;
		id?: string;
		level?: 1 | 2;
	}

	let { kicker, title, sub = '', id, level = 2 }: Props = $props();
</script>

<header class="section-head">
	<svelte:element this={level === 1 ? 'h1' : 'h2'} class="section-title" {id}>{title}</svelte:element>
	{#if sub}
		<p class="section-sub">{sub}</p>
	{/if}
</header>
