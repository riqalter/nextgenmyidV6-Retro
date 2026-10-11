<script lang="ts">
	import { page } from '$app/state';
	import { motion } from '$lib/motion.svelte';
	import { theme } from '$lib/theme.svelte';
	import { icons } from '$lib/icons';

	interface Props {
		/** the name shown in the apple-menu slot */
		name: string;
		items: { href: string; label: string }[];
	}

	let { name, items }: Props = $props();

	let clock = $state('');
	let open = $state(false);
	let menuOpen = $state(false);
	let pull: HTMLButtonElement | undefined = $state();

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	$effect(() => {
		// proof the machine is on — not decoration
		const fmt = new Intl.DateTimeFormat('en-GB', {
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
		const tick = () => (clock = fmt.format(new Date()).replace(',', ''));
		tick();
		const id = setInterval(tick, 15000);
		return () => clearInterval(id);
	});

	function setOpen(next: boolean) {
		menuOpen = next;
		if (next) items.length && document.getElementById('menubar-menu')?.querySelector('a')?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape' || !menuOpen) return;
		// focus must never fall back to <body>
		setOpen(false);
		pull?.focus();
	}

	function onDocClick(e: MouseEvent) {
		if (!menuOpen) return;
		const t = e.target as Node;
		if (pull?.contains(t) || document.getElementById('menubar-menu')?.contains(t)) return;
		setOpen(false);
	}

	function onFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		const menu = document.getElementById('menubar-menu');
		if (!next || (menu && !menu.contains(next) && !pull?.contains(next))) setOpen(false);
	}
</script>

<svelte:window onkeydown={onKeydown} onclick={onDocClick} />

<header class="menubar" id="menubar">
	<a class="menubar-logo" href="/">
		<span class="menubar-mark" aria-hidden="true"></span>
		<span class="sr-only">{name} — home</span>
	</a>

	<button
		type="button"
		class="menubar-pull"
		bind:this={pull}
		aria-expanded={menuOpen}
		aria-controls="menubar-menu"
		onclick={() => setOpen(!menuOpen)}
	>
		Menu
	</button>

	<nav class="menubar-menu" id="menubar-menu" class:is-open={menuOpen} onfocusout={onFocusOut}>
		{#each items as item (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item.href) ? 'true' : undefined}
				onclick={() => setOpen(false)}
			>
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="menubar-right">
		<button
			type="button"
			class="motion-toggle"
			aria-pressed={motion.current === 'on'}
			onclick={() => motion.toggle()}
		>
			<span class="motion-toggle-box" class:checked={motion.current === 'on'} aria-hidden="true"></span>
			<span class="sr-only">Motion</span>
		</button>

		<button
			type="button"
			class="theme-toggle"
			aria-pressed={theme.current === 'dark'}
			onclick={() => theme.toggle()}
		>
			<!-- the moon is the state you would switch TO, so it is the one drawn -->
			<span
				class="theme-toggle-art"
				style="--icon: {theme.current === 'dark' ? icons.sun : icons.moon}"
				aria-hidden="true"
			></span>
			<span class="sr-only">{theme.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
		</button>

		<p class="menubar-clock">{clock}</p>
	</div>
</header>

<style>
	.menubar {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		align-items: stretch;
		height: var(--menubar-h);
		background: var(--paper);
		border-bottom: var(--line) solid var(--ink);
		/* items scroll rather than wrap; the bar never grows */
		overflow-x: auto;
		scrollbar-width: none;
	}

	.menubar::-webkit-scrollbar {
		display: none;
	}

	/* the logo is red at rest, and stays red through the inverse */
	.menubar-logo {
		display: flex;
		align-items: center;
		padding: 0 0.7rem;
		flex-shrink: 0;
	}

	.menubar-mark {
		width: 15px;
		height: 15px;
		background: var(--red);
		/* a 1-bit monogram block: two knocked-out counters */
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 15'%3E%3Cpath d='M1 1h5v2H3v3h3v2H1zm6 0h5v2h-1v8h1v2H7v-2h1V3H7zM11 7h3v2h-3z'/%3E%3C/svg%3E");
		mask-size: contain;
		-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 15'%3E%3Cpath d='M1 1h5v2H3v3h3v2H1zm6 0h5v2h-1v8h1v2H7v-2h1V3H7zM11 7h3v2h-3z'/%3E%3C/svg%3E");
		-webkit-mask-size: contain;
	}

	.menubar-logo:hover {
		background: var(--ink);
		color: var(--red);
	}

	.menubar-logo:hover .menubar-mark {
		background: var(--red);
	}

	.menubar-menu {
		display: flex;
		align-items: stretch;
		flex: 1;
		min-width: 0;
	}

	.menubar-menu a {
		display: flex;
		align-items: center;
		padding: 0 0.75rem;
		flex-shrink: 0;
		font-family: var(--font-ui);
		font-size: 1rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.menubar-menu a:hover {
		background: var(--ink);
		color: var(--paper);
	}

	/* red = you are here */
	.menubar-menu a[aria-current='true'] {
		text-decoration: underline;
		text-decoration-color: var(--red);
		text-decoration-thickness: 3px;
		text-underline-offset: 5px;
	}

	.menubar-right {
		display: flex;
		align-items: stretch;
		margin-left: auto;
		flex-shrink: 0;
	}

	.menubar-clock {
		display: flex;
		align-items: center;
		padding: 0 0.75rem;
		border-left: var(--line) solid var(--ink);
		font-family: var(--font-mono);
		font-size: 1.15rem;
		font-variant-numeric: tabular-nums; /* digits changing must not shift layout */
		white-space: nowrap;
	}

	/* a literal System 1 checkbox: an X drawn from two gradients */
	.motion-toggle {
		display: flex;
		align-items: center;
		padding: 0 0.7rem;
		background: none;
		border: 0;
		border-left: var(--line) solid var(--ink);
		cursor: pointer;
	}

	.motion-toggle-box {
		width: 14px;
		height: 14px;
		border: var(--line) solid var(--ink);
		background: var(--paper);
	}

	.motion-toggle-box.checked {
		background:
			linear-gradient(var(--ink), var(--ink)) center / 100% 2px no-repeat,
			linear-gradient(var(--ink), var(--ink)) center / 2px 100% no-repeat,
			var(--paper);
	}

	/* theme switch — sits beside the motion checkbox, same chrome weight */
	.theme-toggle {
		display: flex;
		align-items: center;
		padding: 0 0.7rem;
		background: none;
		border: 0;
		border-left: var(--line) solid var(--ink);
		cursor: pointer;
	}

	.theme-toggle-art {
		width: 15px;
		height: 15px;
		background: var(--ink);
		mask-image: var(--icon);
		mask-size: contain;
		mask-position: center;
		mask-repeat: no-repeat;
		-webkit-mask-image: var(--icon);
		-webkit-mask-size: contain;
		-webkit-mask-position: center;
		-webkit-mask-repeat: no-repeat;
		transition: none; /* the switch is a hard cut, never a fade */
	}

	.theme-toggle:hover .theme-toggle-art {
		background: var(--red);
	}

	/* ≤840px: the items collapse into a pull-down menu */
	.menubar-pull {
		display: none;
		align-items: center;
		padding: 0 0.9rem;
		background: none;
		border: 0;
		border-right: var(--line) solid var(--ink);
		font-family: var(--font-ui);
		font-size: 1rem;
		cursor: pointer;
	}

	@media (max-width: 840px) {
		.menubar-pull {
			display: flex;
		}

		/* `overflow-x: auto` on .menubar forces overflow-y to compute to
		   `auto` as well — which makes the bar a scroll container that CLIPS
		   its own dropdown. The horizontal scroll only exists so items scroll
		   rather than wrap when they are all visible; once they collapse into
		   the pull-down there is nothing to scroll, so lift the clip. */
		.menubar {
			overflow: visible;
		}

		.menubar-menu {
			position: absolute;
			top: var(--menubar-h);
			left: 0;
			right: 0;
			flex-direction: column;
			background: var(--paper);
			border-bottom: var(--line) solid var(--ink);
			box-shadow: 4px 4px 0 var(--ink);
			display: none;
		}

		.menubar-menu.is-open {
			display: flex;
		}

		.menubar-menu a {
			min-height: 44px;
			border-top: 1px dashed var(--ink);
		}
	}

	@media (max-width: 420px) {
		.menubar-clock {
			display: none;
		}
	}
</style>