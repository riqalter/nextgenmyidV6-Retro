<script lang="ts">
	import { identity, links, nav } from '$lib/content';
	import { icons, type IconName } from '$lib/icons';

	const year = new Date().getFullYear();

	// the desktop doubles as the site's main navigation — same list the menu
	// bar renders, with one icon per window
	const art: Record<string, IconName> = {
		'/': 'monitor',
		'/work': 'folder',
		'/about': 'terminal',
		'/cv': 'film',
		'/contact': 'mail'
	};
	const shortcuts = nav.map((item) => ({ ...item, icon: art[item.href] ?? 'folder' }));
</script>

<footer class="desktop">
	<div class="desktop-icons">
		{#each shortcuts as item (item.href)}
			<a class="desktop-icon" href={item.href}>
				<span
					class="desktop-icon-art"
					style="--icon: {icons[item.icon]}"
					aria-hidden="true"
				></span>
				<span class="desktop-caption">{item.label}</span>
			</a>
		{/each}
		{#each links as link (link.href)}
			<a class="desktop-icon" href={link.href} rel="me noopener" target="_blank">
				<span class="desktop-icon-art" style="--icon: {icons.code}" aria-hidden="true"></span>
				<span class="desktop-caption">{link.label}</span>
			</a>
		{/each}
	</div>

	<div class="desktop-bar">
		<p class="desktop-bar-left">
			{identity.name} — {nav.length} windows open
		</p>
		<p class="desktop-bar-right">
			© {year} · 1-bit, one red, light & dark
		</p>
	</div>
</footer>

<style>
	.desktop {
		margin-top: clamp(5rem, 12vw, 9rem);
		border-top: var(--line) solid var(--ink);
		/* fixed, not scroll — a checkerboard that scrolls gets resampled at
		   sub-pixel offsets and shimmers. Pinned, it reads as a desktop. */
		background: var(--pat-50) 0 0 / 4px 4px fixed;
	}

	.desktop-icons {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(1rem, 3vw, 2rem);
		padding: 3.5rem var(--gutter);
		max-width: var(--measure);
		margin-inline: auto;
	}

	.desktop-icon {
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		width: clamp(5rem, 12vw, 6.5rem);
		text-decoration: none;
	}

	.desktop-icon-art {
		width: 44px;
		height: 44px;
		background: var(--ink);
		/* the icon sits in a paper cut-out on the desktop pattern */
		outline: 4px solid var(--paper);
		mask-image: var(--icon);
		-webkit-mask-image: var(--icon);
		mask-size: 72%;
		mask-position: center;
		mask-repeat: no-repeat;
		-webkit-mask-size: 72%;
		-webkit-mask-position: center;
		-webkit-mask-repeat: no-repeat;
	}

	/* one filter recolours the art without swapping assets: black stays black,
	   white becomes black. Fragile by design — keep these icons pure. */
	.desktop-icon:hover .desktop-icon-art,
	.desktop-icon:focus-visible .desktop-icon-art {
		filter: invert(1) hue-rotate(180deg);
	}

	.desktop-caption {
		max-width: 100%;
		padding: 0 0.3em;
		background: var(--paper); /* punches out of the hatch */
		font-family: var(--font-ui);
		font-size: 0.9rem;
		line-height: 1.2;
		text-align: center;
		overflow-wrap: anywhere;
	}

	.desktop-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		justify-content: space-between;
		padding: 0.4rem var(--gutter);
		background: var(--paper);
		border-top: var(--line) solid var(--ink);
		font-family: var(--font-mono);
		font-size: 1.15rem;
	}

	@media (max-width: 520px) {
		.desktop-icons {
			padding: 2.5rem var(--gutter);
			gap: 1rem;
		}
	}
</style>