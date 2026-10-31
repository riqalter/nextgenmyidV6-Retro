<script lang="ts">
	import { footer, identity, links, nav } from '$lib/content';

	const year = new Date().getFullYear();
</script>

<footer class="desktop">
	<div class="footer-inner">
		<div class="footer-grid">
			<div class="footer-brand">
				<a class="wordmark" href="/" aria-label={`${identity.name} — home`}>
					<span class="brand-mark" aria-hidden="true">&gt;_</span>
					<span>{identity.name}</span>
				</a>
				<p class="footer-blurb">{footer.blurb}</p>
				<p class="footer-location">{identity.location}</p>
				<a class="footer-email" href={`mailto:${identity.email}`}>{identity.email}</a>
			</div>

			<nav class="footer-column" aria-labelledby="footer-explore">
				<h2 id="footer-explore">{footer.explore}</h2>
				<ul>
					{#each nav as item (item.href)}
						<li><a href={item.href}>{item.label}</a></li>
					{/each}
				</ul>
			</nav>

			<nav class="footer-column" aria-labelledby="footer-elsewhere">
				<h2 id="footer-elsewhere">{footer.elsewhere}</h2>
				<ul>
					{#each links as link (link.href)}
						<li>
							<a href={link.href} rel="me noopener" target="_blank">
								{link.footerLabel} <span class="external-arrow" aria-hidden="true">↗</span>
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div class="footer-column footer-contact">
				<h2>{footer.contact}</h2>
				<p>{footer.contactLead}</p>
				<a class="contact-link" href="/contact">
					{footer.contactAction}<span aria-hidden="true">↗</span>
				</a>
				{#if identity.available}
					<p class="availability"><span aria-hidden="true"></span>{footer.available}</p>
				{/if}
			</div>
		</div>

		<div class="footer-meta">
			<p>© {year} {identity.name}</p>
			<p class="footer-colophon">{footer.colophon}</p>
			<a class="back-top" href="#main">{footer.backToTop} <span aria-hidden="true">↑</span></a>
		</div>
	</div>

	<div class="footer-landscape" aria-hidden="true"></div>
</footer>

<style>
	.desktop {
		/* A dark sky in both themes, using the site's existing ink and paper. */
		--footer-ground: var(--ink);
		--footer-ink: var(--paper);
		margin-top: clamp(5rem, 12vw, 9rem);
		border-top: var(--line) solid var(--ink);
		background: var(--footer-ground);
		color: var(--footer-ink);
	}

	:global([data-theme='dark']) .desktop {
		--footer-ground: var(--paper);
		--footer-ink: var(--ink);
	}

	.footer-inner {
		position: relative;
		z-index: 1;
		max-width: var(--measure);
		margin-inline: auto;
		padding: clamp(3rem, 6vw, 5rem) var(--gutter) 0;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(0, 0.8fr) minmax(0, 1.15fr) minmax(0, 1.4fr);
		gap: 2rem;
	}

	.footer-brand,
	.footer-column {
		min-width: 0;
	}

	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
		font: 600 1.55rem/1.1 var(--font-ui);
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		border: var(--line) solid currentColor;
		font: 1.8rem/1 var(--font-mono);
	}

	.footer-blurb {
		max-width: 26ch;
		margin-top: 1.25rem;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.footer-location {
		margin-top: 1.25rem;
		font: 1.2rem/1.4 var(--font-mono);
	}

	.footer-email {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding-block: 0.4rem;
		overflow-wrap: anywhere;
		font-size: 0.9rem;
	}

	.footer-column h2 {
		margin-block: 0.4rem 1.35rem;
		font: 500 1.1rem/1.2 var(--font-ui);
	}

	.footer-column h2::after {
		content: '';
		display: block;
		width: 1.75rem;
		height: 2px;
		margin-top: 0.85rem;
		background: currentColor;
	}

	.footer-column ul {
		list-style: none;
		padding: 0;
	}

	.footer-column li a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		font-size: 0.95rem;
		text-decoration: none;
	}

	.external-arrow {
		font: 1.2rem/1 var(--font-mono);
	}

	.footer-contact > p {
		max-width: 23ch;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.contact-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 44px;
		margin-top: 1.2rem;
		padding: 0.5rem 0.75rem;
		border: var(--line) solid currentColor;
		font: 1.1rem/1.2 var(--font-ui);
		text-decoration: none;
	}

	.contact-link span {
		font: 1.5rem/1 var(--font-mono);
	}

	.footer-contact .availability {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		font: 1.1rem/1.2 var(--font-mono);
	}

	.availability span {
		width: 6px;
		height: 6px;
		flex-shrink: 0;
		background: currentColor;
	}

	.footer-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		margin-top: clamp(2.5rem, 5vw, 4rem);
		font: 1.1rem/1.3 var(--font-mono);
	}

	.back-top {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 44px;
		text-decoration: none;
	}

	.desktop a:hover {
		background: var(--footer-ink);
		color: var(--footer-ground);
	}

	.desktop a:focus-visible {
		outline-color: var(--footer-ink);
	}

	.footer-landscape {
		height: clamp(14rem, 30vw, 30rem);
		margin-top: -1rem;
		background: var(--footer-ink);
		/* Luminance turns the white terrain into paper and lets the sky and
		   engraving reveal the footer ground. No fixed image colors. */
		mask-image: url('/images/footer-landscape.webp');
		mask-mode: luminance;
		mask-size: cover;
		mask-position: center bottom;
		mask-repeat: no-repeat;
	}

	@media (max-width: 900px) {
		.footer-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 2.5rem 2rem;
		}

		.footer-brand {
			grid-column: 1 / -1;
		}

		.footer-blurb {
			max-width: 40ch;
		}

		.footer-location {
			margin-top: 0.75rem;
		}

		.footer-column h2 {
			margin-top: 0;
		}
	}

	@media (max-width: 560px) {
		.footer-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 2rem 1rem;
		}

		.footer-contact {
			grid-column: 1 / -1;
			max-width: 24rem;
		}

		.footer-meta {
			gap: 0.25rem 1rem;
		}

		.footer-colophon {
			order: 1;
			width: 100%;
		}

		.footer-landscape {
			margin-top: 0;
		}
	}

	@media (forced-colors: active) {
		.footer-landscape {
			display: none;
		}
	}
</style>