<script lang="ts">
	import '@fontsource-variable/pixelify-sans';
	import '@fontsource/atkinson-hyperlegible/400.css';
	import '@fontsource/atkinson-hyperlegible/400-italic.css';
	import '@fontsource/atkinson-hyperlegible/700.css';
	import '@fontsource/vt323';
	import '@fontsource/dotgothic16';
	import '../app.css';

	import { page } from '$app/state';
	import { nav, identity } from '$lib/content';
	import MenuBar from '$lib/components/MenuBar.svelte';
	import Desktop from '$lib/components/Desktop.svelte';
	import { watchSystemTheme } from '$lib/theme.svelte';

	let { children } = $props();

	// follow the OS only until the visitor expresses a preference
	$effect(() => watchSystemTheme());

	// the title is the only per-route thing the chrome needs to know
	const titles: Record<string, string> = {
		'/': identity.name,
		'/work/': 'Work — ' + identity.name,
		'/about/': 'About — ' + identity.name,
		'/cv/': 'CV — ' + identity.name,
		'/contact/': 'Contact — ' + identity.name
	};

	const title = $derived(titles[page.url.pathname] ?? identity.name);
</script>

<svelte:head>
	<title>{title}</title>
	<meta
		name="description"
		content="{identity.fullName} — {identity.title.toLowerCase()} based in {identity.location}."
	/>
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