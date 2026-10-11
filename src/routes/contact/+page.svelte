<script lang="ts">
	import { zoom } from '$lib/actions/zoom';
	import { copy, identity, links, sections } from '$lib/content';
	import SectionHead from '$lib/components/SectionHead.svelte';
	import Window from '$lib/components/Window.svelte';

	let name = $state('');
	let email = $state('');
	let message = $state('');
	/** hidden from humans, irresistible to bots — see api/contact.ts */
	let website = $state('');

	let status = $state('');
	let failed = $state(false);
	let sending = $state(false);

	const senders: { label: string; href: string }[] = [
		{ label: identity.email, href: `mailto:${identity.email}` }
	];

	async function send(e: SubmitEvent) {
		e.preventDefault();
		failed = false;

		if (sending) return;

		if (!name.trim() || !email.trim() || !message.trim()) {
			failed = true;
			status = 'All three fields are required.';
			return;
		}

		sending = true;
		status = 'Sending…';

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					message: message.trim(),
					website
				})
			});

			const data = (await res.json().catch(() => ({}))) as { error?: string };

			if (res.ok) {
				status = 'Sent. I will get back to you.';
				name = email = message = '';
				return;
			}

			// 429 and 5xx are our problem, not theirs — offer the way out.
			failed = true;
			status = `${data.error ?? 'Something went wrong.'} You can also email me directly.`;
		} catch {
			// The function is not deployed (a plain `vite dev` has no /api).
			// Falling back to the mail client keeps the page useful either way.
			const subject = encodeURIComponent(`Portfolio enquiry from ${name.trim()}`);
			const body = encodeURIComponent(
				`${message.trim()}\n\n— ${name.trim()} (${email.trim()})`
			);
			status = 'Opening your mail client…';
			window.location.href = `mailto:${identity.email}?subject=${subject}&body=${body}`;
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>Contact — Mikail Thoriq</title>
</svelte:head>

<section class="section">
	<SectionHead
		kicker={sections.contact.kicker}
		title={sections.contact.title}
		sub={sections.contact.sub}
	/>

	<div use:zoom>
		<Window title="Contact — new message" dialog>
			{#snippet children()}
				<form class="contact-form" onsubmit={send} novalidate>
					<div class="field">
						<label for="name">Name <span aria-hidden="true">*</span></label>
						<input
							id="name"
							name="name"
							type="text"
							bind:value={name}
							required
							autocomplete="name"
							maxlength="120"
							placeholder="Your name"
						/>
					</div>

					<div class="field">
						<label for="email">Email <span aria-hidden="true">*</span></label>
						<input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
							maxlength="254"
							placeholder="you@example.com"
						/>
					</div>

					<div class="field">
						<label for="message">Message <span aria-hidden="true">*</span></label>
						<textarea
							id="message"
							name="message"
							rows="6"
							bind:value={message}
							required
							maxlength="5000"
						></textarea>
					</div>

					<!-- honeypot: off-screen, not display:none, not aria-hidden,
					     and tabindex -1 so no keyboard user can ever reach it -->
					<div class="trap" aria-hidden="true">
						<label for="website">Website</label>
						<input
							id="website"
							name="website"
							type="text"
							bind:value={website}
							tabindex="-1"
							autocomplete="off"
						/>
					</div>

					<button type="submit" class="btn btn--default" disabled={sending}>
						{sending ? 'Sending…' : 'Send'}
					</button>

					<p
						class="form-status"
						class:is-error={failed}
						role="status"
						aria-live="polite"
					>
						{status}
					</p>
				</form>
			{/snippet}
		</Window>
	</div>

	<div class="contact-body" style="margin-top: 2rem">
		<div class="prose">
			<p>{copy.contactLead}</p>
		</div>
		<dl class="info">
			{#each senders as sender (sender.href)}
				<div>
					<dt>Email</dt>
					<dd><a href={sender.href}>{sender.label}</a></dd>
				</div>
			{/each}
			{#each links as link (link.href)}
				<div>
					<dt>{link.label}</dt>
					<dd><a href={link.href} rel="me noopener" target="_blank">↗ open</a></dd>
				</div>
			{/each}
		</dl>
	</div>
</section>

<style>
	.contact-form {
		display: grid;
		gap: 1rem;
		max-width: 40rem;
	}

	.contact-form button {
		justify-self: start;
	}

	/* The honeypot must stay reachable to the bots that fill it and invisible
	   to everyone else. Off-screen rather than display:none, because a bot that
	   filters on visibility would then skip it. */
	.trap {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	/* the ▶ prefix is CSS, so an empty status line shows nothing at all */
	.form-status:not(:empty)::before {
		content: '▶ ';
	}

	.form-status {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		min-height: 1em;
	}

	.form-status.is-error {
		color: var(--red);
	}
</style>