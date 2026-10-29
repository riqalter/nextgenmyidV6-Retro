<script lang="ts">
	import { tick } from 'svelte';
	import { zoom } from '$lib/actions/zoom';
	import { copy, identity, links, sections } from '$lib/content';
	import { contactFieldNames, contactLimits, emailDraft, submitContact, validateContact, type FieldErrors } from '$lib/contact';
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
	let errors: FieldErrors = $state({});
	const draftHref = $derived(emailDraft(identity.email, { name, email, message }));

	const senders: { label: string; href: string }[] = [
		{ label: identity.email, href: `mailto:${identity.email}` }
	];

	async function focusError() {
		await tick();
		const first = contactFieldNames.find((field) => errors[field]);
		if (first) document.getElementById(first)?.focus();
	}

	async function send(e: SubmitEvent) {
		e.preventDefault();
		if (sending) return;
		failed = false;
		const validation = validateContact({ name, email, message });
		errors = validation.errors;
		if (Object.keys(errors).length) {
			failed = true;
			status = 'Please correct the fields marked below.';
			await focusError();
			return;
		}
		sending = true;
		status = 'Sending…';
		const result = await submitContact({ ...validation.fields, website });
		sending = false;
		status = result.message;
		failed = !result.ok;
		if (result.ok) name = email = message = website = '';
		else if (result.errors) {
			errors = result.errors;
			await focusError();
		}
	}
</script>

<svelte:head>
	<title>Contact — Mikail Thoriq</title>
</svelte:head>

<section class="section">
	<SectionHead
		level={1}
		kicker={sections.contact.kicker}
		title={sections.contact.title}
		sub={sections.contact.sub}
	/>

	<div use:zoom>
		<Window title="Contact — new message" dialog>
			{#snippet children()}
				<form class="contact-form" method="post" action="/api/contact" onsubmit={send} novalidate aria-busy={sending}>
					<p>All fields are required. Your message stays here if sending fails.</p>
					<div class="field">
						<label for="name">Name <span aria-hidden="true">*</span></label>
						<input
							id="name"
							name="name"
							type="text"
							bind:value={name}
							readonly={sending}
							aria-invalid={Boolean(errors.name)}
							aria-describedby={errors.name ? 'name-error' : undefined}
							required
							autocomplete="name"
							maxlength={contactLimits.name}
							placeholder="Your name"
						/>
						{#if errors.name}<p class="field-error" id="name-error">{errors.name}</p>{/if}
					</div>

					<div class="field">
						<label for="email">Email <span aria-hidden="true">*</span></label>
						<input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							readonly={sending}
							aria-invalid={Boolean(errors.email)}
							aria-describedby={errors.email ? 'email-error' : undefined}
							required
							autocomplete="email"
							maxlength={contactLimits.email}
							placeholder="you@example.com"
						/>
						{#if errors.email}<p class="field-error" id="email-error">{errors.email}</p>{/if}
					</div>

					<div class="field">
						<label for="message">Message <span aria-hidden="true">*</span></label>
						<textarea
							id="message"
							name="message"
							rows="6"
							bind:value={message}
							readonly={sending}
							aria-invalid={Boolean(errors.message)}
							aria-describedby={errors.message ? 'message-error' : undefined}
							required
							maxlength={contactLimits.message}
						></textarea>
						{#if errors.message}<p class="field-error" id="message-error">{errors.message}</p>{/if}
					</div>

					<!-- Off-screen honeypot, excluded from assistive technology and tab order. -->
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

					<button type="submit" class="btn btn--default" aria-disabled={sending}>
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
					{#if failed}
						<a class="btn email-fallback" href={draftHref}>Open email app with this message</a>
						<p class="fallback-hint">Your email app will open a draft. Review it there, then send.</p>
					{/if}
					<noscript><p>To send a message, email <a href="mailto:{identity.email}">{identity.email}</a>.</p></noscript>
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
	.email-fallback { justify-self: start; }
	.field-error { color: var(--red); font-size: 0.95rem; }
	.fallback-hint { color: var(--muted); font-size: 0.95rem; }

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
