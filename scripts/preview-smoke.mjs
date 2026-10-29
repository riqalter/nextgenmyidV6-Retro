import assert from 'node:assert/strict';

assert(process.env.PREVIEW_URL, 'Set PREVIEW_URL to a running local, Vercel or Netlify preview URL.');
const url = new URL('/api/contact', process.env.PREVIEW_URL);
const headers = { 'Content-Type': 'application/json' };
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
	headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}
// Invalid fields must return before limiter/config/provider access: this cannot send mail.
const start = Date.now();
const response = await fetch(url, { method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(5000) });
assert.equal(response.status, 400, 'Expected the deployed contact function to reject empty fields.');
const body = await response.json();
for (const field of ['name', 'email', 'message']) assert.equal(typeof body.fields?.[field], 'string');
console.info(`Contact preview smoke passed (${Date.now() - start}ms); no email was sent.`);
