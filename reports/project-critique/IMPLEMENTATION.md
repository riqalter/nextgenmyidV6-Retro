# Recommendation implementation

Implemented on 29 October 2026. The existing pixel desktop, theme system,
offscreen animation suspension and static architecture are preserved.

| Recommendation | Implementation |
| --- | --- |
| R1 | Explicit populated email-app action; status-specific feedback; 12-second request timeout; drafts clear only after `{ ok: true }`. |
| R2 | Independent API type check, mocked handler tests, Vercel parsed-body support with raw-stream fallback, local API adapter and validation-only preview smoke script/workflow. |
| R3 | Three prerendered case studies with responsibilities, constraints, tradeoffs, workflow figures, results and evidence links. Claims come from the existing CV and linked project documentation; no new numerical outcomes. |
| R4 | Shared client/server validation, field errors, ARIA associations and first-invalid-field focus. Sending preserves keyboard focus. |
| R5 | Featured work leads; recent repositories and account cards are behind a native disclosure, with links to the full external archives. |
| R6 | Explicit completeness/source states; versioned, validated, complete-only disk cache; partial failures cannot replace a complete snapshot. |
| R7 | Five-second GitHub request budget with concurrent independent requests; offline fallback; documented build/deployment freshness and CI cache limitations. Repository changes require a rebuild. |
| R8 | Counts and ordering describe their own windows; per-account subset limits are explicit; selection claims removed. |
| R9 | Atomic shared Redis limits, expiring hashed keys, a global daily cap, Vercel edge IP handling, retry guidance, fail-closed sending and outcome-only logs. Requires Upstash configuration. |
| R10 | Main headings on Work, Contact and About; visible motion label; balanced three-column featured grid; unused Japanese font removed and body/mono imports scoped to Latin. Icon hover now uses the theme accent. |
| R11 | Reconciled README and full environment template, clean-install CI, API/frontend checks, focused tests, production build, route metadata, canonical URLs, sitemap and robots output. |

## Verification completed

- `npm run check`: frontend 0 errors/0 warnings; API TypeScript check passes.
- An intentional temporary API type error failed `check:api`; the probe was removed.
- `npm test`: 21 tests pass with mocked transports and no real credentials or email.
- `npm run build`: normal production build passes.
- Separate cold offline build passes with the cache temporarily absent; generated
  Work HTML contains the unavailable notice and all three featured projects.
  The complete local cache was restored afterward.
- `PREVIEW_URL=http://127.0.0.1:5173 npm run test:preview`: local raw-Node
  handler returns structured validation errors promptly; no email is sent.
- Production output includes all three case-study routes, sitemap and robots.
- Browser samples include desktop and narrow layouts, both themes, case-study
  reading, expanded archive, field-error focus/associations, malformed email,
  missing-endpoint draft recovery, mobile menu Escape and CV layout/download.
- Impeccable mechanical detector reports no findings.

## Credentialed local verification

After the user filled `.env`, required-setting and format checks passed without
printing credentials. The live Redis connection, per-IP threshold, global
threshold and key expiry passed using isolated temporary keys, which were then
removed. The local validation smoke passed again in 81 ms without sending mail.

With explicit user approval, exactly one test message was submitted through the
local `/api/contact` endpoint. MailerSend accepted it for sending and the handler
returned HTTP 200 with `{ ok: true }`. Recipient inbox delivery still needs user
confirmation. The automated test suite continues to use mocked transports only.

## Checks requiring deployment or additional equipment

Configure the server variables on Vercel and run the preview smoke against that
deployed URL to verify the platform path. The GitHub Actions workflows are
prepared but have not run on GitHub during this local task.

Actual print output, assistive technology, physical devices, deployed Core Web
Vitals and a before/after browser font-transfer comparison remain manual checks.
No measured performance or font-download saving is claimed.
