<script lang="ts">
	import '@fontsource-variable/pixelify-sans';
	import '@fontsource/atkinson-hyperlegible/latin-400.css';
	import '@fontsource/atkinson-hyperlegible/latin-400-italic.css';
	import '@fontsource/atkinson-hyperlegible/latin-700.css';
	import '@fontsource/vt323/latin-400.css';
	import '../app.css';

	import { page } from '$app/state';
	import { nav, identity } from '$lib/content';
	import { pageMetadata } from '$lib/seo';
	import MenuBar from '$lib/components/MenuBar.svelte';
	import Desktop from '$lib/components/Desktop.svelte';
	import { watchSystemTheme } from '$lib/theme.svelte';

	let { children } = $props();

	// follow the OS only until the visitor expresses a preference
	$effect(() => watchSystemTheme());

	const meta = $derived(pageMetadata(page.url.pathname));
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={meta.canonical} />
	<meta property="og:site_name" content={identity.name} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:url" content={meta.canonical} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<MenuBar name={identity.name} items={nav} />

<main id="main">
	{@render children()}
</main>

<Desktop />

<style>
	main {
		display: block;
		/* the full-bleed sections break out of the 1120px measure themselves */
		min-height: 60vh;
	}
</style>
