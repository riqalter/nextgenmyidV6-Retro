# Mikail Thoriq — personal site

A 1-bit portfolio built with Svelte 5 and SvelteKit. Static pages and three
engineering case studies sit inside a pixel desktop; a separate serverless
function handles contact email on Vercel or Netlify.

![Home](docs/screenshots/home.png)

The visual specification lives in `DESIGN_LANGUAGE.md`, `COLORSTYLE.md` and
`HOWITSWORK.md`. Preserve the warm paper, ink, single red, hard window borders,
stepped animation, readable body font and coordinated dark theme. The screenshots
in `docs/screenshots/` show the earlier version; regenerate them deliberately
when updating the visual documentation.

## Getting started

Use Node.js 22 or newer and npm.

```bash
npm ci
cp .env.example .env
# Fill .env as described below; the static preview needs no credentials.
npm run dev           # frontend, http://localhost:5173
npm run dev:full      # frontend + real local contact handler, reads .env
```

`dev:full` compiles the Node handler and shared contact service and mounts them
in Vite. Restart it after API source or .env changes. `vercel dev` tests Vercel's
request helpers; `npx netlify-cli dev` tests Netlify's function at
`http://localhost:8888` using the checked-in configuration and local `.env`.
Plain `dev` and `preview` do not mount the API:
the contact page offers an explicit email-app action after a failed request.
It keeps the entered draft and never opens another app automatically.

## Environment configuration

All credentials remain server-side. `.env` is ignored; `.env.example` contains
the complete template. Also set the relevant variables in your hosting project
for each deployment environment; local .env values are not uploaded for you.
On Netlify, set contact variables through the UI, CLI or API with the Functions
scope when scope selection is available. Build-time GitHub variables need the
Builds scope. Variables in `netlify.toml` are not available to functions at
runtime. Redeploy after changing hosted variables. See
[Netlify's function environment documentation](https://docs.netlify.com/build/functions/environment-variables/).

| Variable | Use |
| --- | --- |
| `GITHUB_TOKEN` | Optional read-only public GitHub access for build-time fetching. `GH_TOKEN` is also recognised. |
| `MAILERSEND_API_TOKEN` | Required for the contact form: MailerSend token with email sending permission. |
| `MAILERSEND_TO` | Required: the inbox receiving contact messages. |
| `MAILERSEND_FROM` | Required: a verified MailerSend sender. It may differ from the recipient. |
| `MAILERSEND_FROM_NAME` | Optional sender display name. |
| `UPSTASH_REDIS_REST_URL` | Required for sending: HTTPS REST endpoint of your Upstash Redis database. |
| `UPSTASH_REDIS_REST_TOKEN` | Required: standard Redis REST token with scripting/write permission. |
| `CONTACT_DAILY_LIMIT` | Optional positive integer; defaults to 25 accepted requests per 24-hour window across every instance and IP. |
| `ALLOWED_ORIGIN` | Optional exact origin without a trailing slash. Blank uses same-host validation; set the production origin in the production environment only. |
| `GITHUB_OFFLINE` | Set to `1` to skip GitHub requests for an offline build. |

Create a database in the [Upstash console](https://console.upstash.com/) and
copy its REST URL and standard token. Use a sender from your verified domain
or the trial sender shown by [MailerSend](https://www.mailersend.com/).
An arbitrary Gmail address is not a verified sender just because it is yours.

The contact function accepts only JSON POSTs, validates fields before contacting
external services, checks a honeypot, and sends plain text with the visitor as
Reply-To. Vercel's parsed `req.body`, raw Node streams and Netlify's Web Request
streams are supported by the hosting adapters and shared contact service.
Requests have a 24 KB body ceiling, a 2-second raw-body wait, a 2-second Redis
timeout and a 6-second provider timeout. The browser stops waiting after 12 seconds.
Only a MailerSend queued response with a message ID counts as accepted;
acceptance is not a delivery receipt. Suppressed or paused sends return failure.

## Sending limits and operations

An atomic Redis script allows 5 requests per IP per minute, plus the shared
daily quota. Keys expire and contain keyed digests instead of raw IPs. On
Vercel, the function uses its edge-provided `x-vercel-forwarded-for` header;
Netlify uses the platform's `context.ip`, ignoring forwarding headers supplied
by visitors. Local `dev:full` uses the socket address. Both hosts share quota
when configured with the same Redis database, token and recipient. Deploying
behind a different proxy requires reviewing that trust boundary.

Missing configuration or an unavailable limiter disables sending and leaves
direct email available. Origin checks limit browser misuse; direct scripts
without an Origin still pass through the same shared quota. Requests accepted
by the limiter consume quota even if the mail provider later fails.

Function logs on either host contain only outcome events and provider status codes:
`accepted`, `throttled`, `configuration_missing`, `limiter_unavailable`,
`provider_rejected`, `provider_unreachable`. Inspect counts and failures there,
and delivery status, suppression and sending volume in the MailerSend dashboard.
Set provider usage alerts/limits to your own budget. Message bodies, sender
addresses and tokens are never logged by this handler.

## Content and repository snapshots

`src/lib/content.ts` holds the CV, identity, featured projects and account list.
`src/lib/case-studies.ts` contains the three stories, grounded in that CV and
linked project artifacts. Edit these when responsibilities or outcomes change;
do not invent metrics. Generated archive descriptions identify the language and
owner when the upstream repository has no description.

The Work page leads with the case studies. Its optional archive includes up to
18 non-fork, non-archived repositories per account from the first 100 API results,
excluding featured projects, ordered by last push. Full archives remain linked
on GitHub. This is a recent subset, not a paginated inventory of every repository.

GitHub is fetched **at build time**, with independent requests bounded at five
seconds. The deployed HTML changes on the next build/deployment. A cache TTL
does not refresh an already deployed page. Rebuild after repository changes;
no automatic recurring rebuild is configured.

`.github-cache.json` is an ignored, versioned, complete-only cache: six hours
without a token, thirty minutes with one. Partial refreshes never overwrite a
complete snapshot. A failed refresh serves the last complete snapshot as stale;
a cold failure serves partial data or an unavailable notice while retaining all
handwritten work. Old or malformed caches are discarded. Delete this one file
to force a refresh. Fresh CI checkouts have no cache; CI deliberately checks that
an offline cold build succeeds. If your deployment requires a persistent stale
snapshot, restore/save this file through your CI cache before/after the build.

## Verification

```bash
npm run check         # frontend diagnostics AND separate API TypeScript check
npm test              # focused Node tests, mocked transports, no credentials/email
npm run build         # static output in build/
npm run preview       # production frontend at localhost:4173
npm run verify        # checks + tests + production build
```

The tests cover field validation, contact failure/recovery responses, request
parsing and limits, origins, shared-quota requests, provider rejection/timeouts,
GitHub partial/stale/offline behavior, corrupt caches and case-study metadata.
Netlify adapter tests also cover streamed bodies, trusted client IPs and response
headers. Tests do not verify real provider delivery or hosted deployment behavior.

After a Vercel or Netlify preview is deployed, run this validation-only smoke test:

```bash
PREVIEW_URL=https://your-preview.vercel.app npm run test:preview
# Or use https://your-preview.netlify.app (also works with netlify dev on :8888).
```

It sends empty fields and requires a prompt 400 response with field errors.
It cannot reach Redis or send mail. For protected previews, provide
`VERCEL_AUTOMATION_BYPASS_SECRET` through the environment. The same check is
available as the manual **Contact preview smoke** GitHub Actions workflow.
The **Verify** workflow runs clean installation, both checks, offline tests and
a cold offline production build on pushes and pull requests.

## Deployment and discovery

`vercel.json` serves `build/` and deploys `api/contact.ts` with a 15-second
invocation budget.

For Netlify, import this repository with its root as the base directory.
`netlify.toml` selects Node.js 22, runs `npm run build`, publishes `build/`, and
bundles `netlify/functions/contact.ts` with esbuild. The function's `config.path`
serves `/api/contact`, so the frontend uses the same URL on both platforms.
The existing static SvelteKit adapter is sufficient; no adapter switch or SPA
catch-all redirect is needed. See
[Netlify's static SvelteKit setup](https://docs.netlify.com/build/frameworks/framework-setup-guides/sveltekit/)
and [function routing](https://docs.netlify.com/build/functions/configuration/).

Before enabling real sending, set the MailerSend and Upstash variables listed
above in the hosting project. Leave `ALLOWED_ORIGIN` blank for same-host checks
on preview URLs, or set it to the production origin in the production context
only. Deploy through Git or the Netlify CLI so the function is bundled with the
site; uploading only `build/` does not include the contact API. Run the preview
smoke test against the deployed URL to confirm routing without sending mail.

On other static hosts, the frontend offers the email draft action; form delivery
requires an equivalent function.

`src/lib/seo.ts` defines the production origin, route-specific sharing metadata,
canonical URLs and public paths. Change its origin if moving domains. Sitemap
and robots endpoints are prerendered as `build/sitemap.xml` and `build/robots.txt`.
Pages use directory-style URLs with trailing slashes.

The original PDF is served at `/cv/mikail-thoriq-banowo-cv.pdf`; the CV route
also has a print stylesheet. Theme and motion preferences resolve before first
paint; preserve the existing keyboard focus, reduced-motion and hidden-tab
animation behavior. The unused Japanese font was removed; body and mono fonts
load only their Latin subsets, with system fallback for other scripts.
