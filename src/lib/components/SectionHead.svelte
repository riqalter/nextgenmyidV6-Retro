<script lang="ts">
	interface Props {
		/** section number — set in red, the "you are here" mark */
		kicker: string;
		title: string;
		sub?: string;
		id?: string;
	}

	let { kicker, title, sub = '', id }: Props = $props();
</script>

<header class="section-head">
	<p class="section-kicker">{kicker}</p>
	<h2 class="section-title" {id}>{title}</h2>
	{#if sub}
		<p class="section-sub">{sub}</p>
	{/if}
</header>