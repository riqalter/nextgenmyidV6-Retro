// Diagnose Resend sending access without sending email or using the contact quota.
const missing = ['RESEND_API_KEY', 'RESEND_FROM', 'RESEND_TO'].filter((name) => !process.env[name]);
if (missing.length) {
	console.error(`Set ${missing.join(', ')} in .env or the process environment.`);
	process.exitCode = 1;
} else {
	try {
		// No sender, recipient or content: this request can never send an email.
		// Use the sending endpoint so the production key only needs Sending access.
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST', signal: AbortSignal.timeout(6000), body: '{}',
			headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }
		});
		const body = await response.json().catch(() => null);
		console.info(`Resend authorization probe: HTTP ${response.status}; no email was sent.`);
		if (response.status === 422 && ['missing_required_field', 'missing_required_parameter'].includes(body?.name)) {
			console.info('API key accepted; the empty email was rejected as expected. Verify that the RESEND_FROM domain is verified at https://resend.com/domains before deploying. This probe does not verify domain ownership or delivery.');
		} else {
			process.exitCode = 1;
			if (response.status === 401 || response.status === 403) {
				console.error('Resend denied access. Check RESEND_API_KEY, its Sending permission and domain restriction at https://resend.com/api-keys.');
			} else if (response.status === 429) {
				console.error('Resend has reached an API or email quota. Check https://resend.com/settings/usage and retry after the quota resets.');
			} else {
				console.error('Could not confirm Resend authorization. Check the API key and service status in the Resend dashboard.');
			}
		}
	} catch {
		console.error('The Resend diagnostic request failed or timed out. No credentials or provider response content were logged.');
		process.exitCode = 1;
	}
}
