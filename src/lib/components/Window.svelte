<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** thicker, double-ruled — the alert box variant */
		dialog?: boolean;
		/** decorative close box; windows aren't actually closable, it's the chrome */
		closable?: boolean;
		class?: string;
		children: Snippet;
	}

	let { title, dialog = false, closable = true, class: klass = '', children }: Props = $props();
</script>

<section class="window {dialog ? 'window--dialog' : ''} {klass}">
	<header class="window-title">
		{#if closable}
			<span class="window-close" aria-hidden="true"></span>
		{/if}
		<span class="window-title-text">{title}</span>
	</header>
	<div class="window-body">
		{@render children()}
	</div>
</section>

<style>
	.window {
		min-width: 0;
	}

	.window--dialog .window-title {
		height: auto;
		min-height: 1.9rem;
		padding: 6px 3px;
	}
</style>