⚠️ DEGRADED: single-context (sub-agents declined by user). Design judgment was recorded before the automated detector ran; the two assessments were sequential and were not independent.

# Pixelstyle — Project Critique and Recommendations

**Review date:** 29 October 2026  
**Reviewed revision:** `422198d`, with a clean working tree before this report  
**Project:** Mikail Thoriq’s personal portfolio, built with Svelte 5, SvelteKit, and static output  
**Scope:** Product communication, interface design, accessibility, contact delivery, build reliability, and maintainability

## Executive assessment

The project has a clear visual point of view. Its pixel typography, hard window borders, warm paper, restrained red, and coordinated dark theme form a recognizable identity. Keep that identity. A conventional portfolio redesign would discard one of the project’s strongest assets.

The largest opportunity is to make the engineering work as convincing as the interface. The selected projects explain what was built and which technologies were used, but provide little evidence of personal contribution, engineering decisions, or results. The repository archive then makes visitors do much of the evaluation themselves.

The most concrete functional problem is the contact fallback: the README promises an automatic mail-client fallback when the API is unavailable, but an HTTP 404 follows the error-message branch instead. The build and Svelte checks pass, but those checks do not currently cover the contact function at `api/contact.ts`.

**Recommended order:** repair contact behavior and its verification, strengthen three project stories, then correct repository freshness and presentation. Refine the existing design after those changes.

## Review method and limits

This report combines source inspection with a local browser review. The assumed primary audiences are prospective employers, collaborators, and clients; that assumption is inferred from the portfolio, CV, and contact flows rather than a separate product brief.

| Check | Result | Interpretation |
|---|---|---|
| `npm run check` | Passed: 0 errors, 0 warnings | Good baseline for included Svelte/TypeScript files; not proof of every user flow |
| `npm run build` | Passed; static output written to `build/` | The current checkout can build successfully |
| Impeccable detector over `src` | Returned `[]`: 0 findings | No patterns flagged by this detector; not an accessibility or usability certification |
| Browser review | Home, Work, Contact, and CV; light and dark themes sampled | Direct evidence for the observations below |
| Responsive sampling | 1280 × 720 desktop and 390 × 844 mobile | Useful samples, not exhaustive device coverage |
| Mobile navigation | Menu opened; Escape closed it and returned focus to the trigger | A working interaction worth preserving |
| Empty contact submission | Displayed “All three fields are required”; focus stayed on Send | Generic feedback works, but field-specific recovery is missing |
| Local API probe | `POST /api/contact` with `{}` returned HTTP 404 under Vite | Confirms the missing-endpoint condition in ordinary local development |

No real email was sent. Production MailerSend delivery, Vercel runtime behavior, screen-reader behavior, printed output, real-device performance, and measured Core Web Vitals were not verified. About was inspected at the source level rather than visually reviewed in depth. Findings marked **risk** or **verification gap** should not be read as reproduced production failures.

## What is working

1. **A coherent, authored visual system.** The desktop metaphor reaches navigation, windows, icons, motion, and theme tokens. It feels intentional rather than assembled from unrelated components.
2. **A sensible foundation for a small portfolio.** Static prerendering, centralized editorial data, reusable components, and build-time GitHub fetching keep the visitor-facing system relatively simple. Handwritten featured projects remain available when GitHub fails.
3. **Several accessibility decisions are already thoughtful.** There is a skip link, visible keyboard focus styling, reduced-motion initialization, a motion control, a screen-reader alternative to animated roles, and readable body typography separate from the pixel display face.

## Design health assessment

Scores are reviewer judgments: **0 = absent or seriously broken; 4 = excellent**. This is an Experience surface with a contact task. Advanced efficiency features and dedicated help are not required, so heuristics 7 and 10 are excluded.

| # | Heuristic | Score | Main observation |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Active navigation and form status exist; repository status copy can misrepresent its scope |
| 2 | Match with the real world | 2 | Technology-heavy copy and “selected” telemetry require interpretation |
| 3 | User control and freedom | 3 | Navigation, theme, motion, and mobile Escape behavior provide useful control |
| 4 | Consistency and standards | 3 | Strong visual consistency; project destinations and section statistics need clearer meaning |
| 5 | Error prevention | 2 | Required fields and length limits exist; client-side email validity is bypassed |
| 6 | Recognition rather than recall | 2 | Readers must leave the site to assemble much of the evidence for project quality |
| 7 | Flexibility and efficiency | n/a | Advanced shortcuts are unnecessary for this portfolio |
| 8 | Aesthetic and minimalist design | 3 | Distinctive composition; metadata and archive volume weaken emphasis |
| 9 | Error recovery | 2 | Direct email is available, but fallback and field-level guidance need work |
| 10 | Help and documentation | n/a | A dedicated visitor help system is unnecessary |
| | **Total** | **20/32** | **Strong visual identity; uneven task clarity and supporting evidence** |

### Cognitive load and emotional journey

The initial visit is focused: a name, positioning statement, and two clear actions. Five top-level navigation choices are reasonable here and do not justify adding another navigation layer.

The Work archive creates more friction. It rendered **39 repository cards**, several without descriptions, beneath the three selected projects. Chunking, choice reduction, and progressive disclosure are the three weakest cognitive-load checks. Grouping, the initial hierarchy, and basic navigation are stronger. This is a moderate editorial overload rather than a reason to turn the site into a complex search application.

The likely emotional journey is curiosity at the opening, interest in the selected work, a confidence valley when results and responsibilities are missing, and possible frustration if contact fails. These are design hypotheses, not observed conversion data. Improvements should focus on those latter two moments.

## Priority recommendations

**Priority guide:** P1 = address next because it affects a core task or the portfolio’s purpose; P2 = meaningful improvement after that; P3 = lower-impact refinement. No P0 emergency was established.

### R1 — P1: Make contact fallback behavior match its promise

**Status:** Confirmed control-flow defect, with the missing-endpoint condition reproduced locally.  
**Evidence:** [Contact page](../../src/routes/contact/+page.svelte), `send()`; [README](../../README.md), contact setup and fallback notes.

The fallback to `mailto:` exists only in `catch`. HTTP error responses resolve `fetch`, so the local 404 goes through the error branch. A malformed or absent JSON response is converted to `{}`. The README’s claim that ordinary `vite dev` automatically opens the mail client is therefore inaccurate.

**Recommendation:** handle endpoint absence explicitly and show an “Open email app with this message” action populated from the draft. Give visitors control over opening another app. Distinguish unavailable service, invalid input, rate limiting, and delivery failure. Add a client request timeout and preserve all input on failure. Require the expected success response before clearing the draft rather than treating every 2xx response as successful delivery.

**Acceptance checks:** a 404, rejected request, timeout, 429, 400, 502, and unexpected 200 response each produce understandable feedback and retain the draft; a valid success clears it. The email fallback contains the entered message. Use mocked transport for these checks.

### R2 — P1: Verify the contact function as a separate deployable component

**Status:** Confirmed check-coverage gap; deployment compatibility remains unverified.  
**Evidence:** [Package scripts](../../package.json), [TypeScript configuration](../../tsconfig.json), generated `.svelte-kit/tsconfig.json`, and [contact function](../../api/contact.ts).

The inherited TypeScript include list covers `src`, test directories, and Vite configuration, but not the top-level `api` directory. `npm run check` can pass while this function has type errors. The static frontend build also does not demonstrate that the function works in its deployment runtime.

**Recommendation:** add an explicit API type-check target and a small set of handler tests using a mocked email provider. Exercise invalid JSON, body limits, invalid fields, honeypot behavior, rejected origin, throttling, missing configuration, provider rejection, and provider timeout. Add a Vercel preview smoke test that checks request parsing without sending mail.

The current function reads the Node request stream manually. Verify that choice against the deployed runtime’s body helpers before changing it; this review did not prove a runtime parsing failure. [Vercel’s Node runtime documentation](https://vercel.com/docs/functions/runtimes/node-js) describes supported request helpers.

**Acceptance checks:** a deliberate API type error fails the check command, handler tests run without real credentials or email, and the preview function returns the expected validation response promptly.

### R3 — P1: Turn the three featured projects into evidence of engineering ability

**Status:** Editorial recommendation supported by source and rendered cards.  
**Evidence:** [Featured project data](../../src/lib/content.ts), `featured`; [FileCard](../../src/lib/components/FileCard.svelte); [Work page](../../src/routes/work/+page.svelte).

The cards describe features and technologies. They do not explain the owner’s individual responsibility, a difficult decision, a demonstrated outcome, or what a visitor should inspect. Clicking takes readers directly to a repository or external product, so the portfolio gives up control of the explanation early.

**Recommendation:** write one concise case study for each selected project: problem, personal role, constraints, key decision and tradeoff, evidence, and result. Include an actual interface image, a relevant architecture figure, or an evaluation artifact where it helps. Preserve the 1-bit framing while keeping evidence legible. Provide distinct “Read case study,” “View source,” and “Open product” actions where applicable.

Only add metrics that can be supported. A clear qualitative outcome is better than an invented accuracy gain, user count, or performance improvement.

**Acceptance checks:** a visitor can identify what Mikail personally contributed and why it matters without leaving the portfolio. Each story contains at least one concrete piece of evidence and a clear next action.

### R4 — P2: Improve field-specific validation and recovery

**Status:** Confirmed implementation and observed empty-submit behavior.  
**Evidence:** [Contact page](../../src/routes/contact/+page.svelte), form markup and `send()`; [server validation](../../api/contact.ts), `validate()`.

The form uses `novalidate`, but its custom client validation checks only whether fields are empty. A nonempty malformed email can reach the server. Error feedback is a shared status sentence without `aria-invalid` or field-specific `aria-describedby` associations. Focus remains on Send after an empty submission.

**Recommendation:** either use native constraint validation or complete the custom path. Add specific text beside each failing field, associate it programmatically, move focus to the first invalid field after submission, and return structured field errors from the server. Keep the existing live status for sending and overall results.

This follows the intent of [WCAG error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification): identify the erroneous item and describe the error in text. A red border alone is insufficient guidance.

**Acceptance checks:** blank fields, whitespace-only values, and malformed email are identified before a network request; keyboard and assistive-technology users can locate the relevant correction. Server validation still enforces the same constraints.

### R5 — P2: Separate curated work from the repository archive

**Status:** Observed information-density problem.  
**Evidence:** [Work page](../../src/routes/work/+page.svelte) and [GitHub mapping](../../src/lib/server/github.ts), `toProject()` and `requestGithub()`.

The three selected projects receive the same basic card language as a long collection of experiments, older exercises, and repositories with empty descriptions. Recency is a weak substitute for relevance when someone is judging capability.

**Recommendation:** make the three case studies the main reading path. Put the remaining repositories behind a clearly labeled archive link or disclosure, or initially show a small curated sample. Supply short editorial descriptions for promoted repositories. Add simple topic filtering only if the archive’s use justifies it; start with curation.

**Acceptance checks:** a visitor can distinguish the strongest work immediately. Opening the archive is intentional, and its entries explain their purpose. The full archive remains reachable.

### R6 — P2: Correct the GitHub cache’s definition of success

**Status:** Confirmed logic defect from source inspection; account failure was not injected.  
**Evidence:** [GitHub fetcher](../../src/lib/server/github.ts), `fetchGithub()` around lines 150–165 and `requestGithub()` around lines 179–225.

`requestGithub()` returns `ok: true` when any repositories were collected, even when another account failed and `problems` is nonempty. `fetchGithub()` writes every `ok` result to cache. This contradicts its comment that only fully successful results are cached and can replace a complete cache with partial data. The UI also interprets any `data.error` as a cached-copy fallback, although the response may be fresh partial data.

**Recommendation:** represent completeness and freshness explicitly, for example `complete`, `partial`, `stale`, and `unavailable`. Preserve the last complete cache on partial failure, or keep separate caches per account. Ensure the displayed status describes the actual data source.

**Acceptance checks:** with one account failing and another succeeding, a previously complete cache is not overwritten as complete. Fresh partial results and stale fallback results receive different labels.

### R7 — P2: Bound build-time fetching and clarify freshness

**Status:** Reliability risk and an operational limitation, not a reproduced build hang.  
**Evidence:** [GitHub fetcher](../../src/lib/server/github.ts), `get()` and its sequential account loop; [cache](../../src/lib/server/github-cache.ts); [prerender configuration](../../src/routes/+layout.ts).

GitHub requests have no explicit application timeout. A stalled upstream can delay the build until another layer ends it. The six-hour/30-minute cache TTL is evaluated during builds; it does not refresh an already deployed static page. A local ignored cache is also not guaranteed to survive a fresh CI checkout.

**Recommendation:** give each upstream request a bounded timeout and preserve the fallback behavior. Document the distinction between cache age and deployment refresh. Decide whether repository updates require a rebuild; if automatic freshness matters, configure a rebuild trigger or schedule deliberately. Persist or seed fallback data in CI if cold-build resilience is a requirement.

**Acceptance checks:** a simulated hanging request fails within the chosen budget, and a cold offline build still presents the handwritten work with accurate availability text. Maintainers can explain when the deployed repository list next updates.

### R8 — P2: Make window metadata describe the visible content

**Status:** Confirmed in the rendered Work page and source.  
**Evidence:** [Work page](../../src/routes/work/+page.svelte), `all`, `total`, and the first Finder info bar; [GitHub fetcher](../../src/lib/server/github.ts), `PER_ACCOUNT = 18`.

The first window reported **42 items** while containing three featured cards. It said “sorted by last push,” although those three cards follow the handwritten featured order. The repository window says “all repositories,” while the fetcher caps each account at 18 after examining only its first 100 API results. “39 of 39 selected” resembles a selectable file-browser state even though selection is not implemented.

**Recommendation:** report “3 featured projects” in the first window, label the second as “Recent repositories” or another accurate subset, and remove selection and sorting claims that do not describe the visible interaction. If completeness is required, implement pagination deliberately instead of changing the label alone.

**Acceptance checks:** every count matches its own window, every sorting claim matches that list, and limited datasets are described as limited.

### R9 — P2: Give the public email endpoint proportionate abuse protection

**Status:** Known architectural limitation; no abuse or quota exhaustion was tested.  
**Evidence:** [Contact function](../../api/contact.ts), `HITS`, `rateLimited()`, `clientIp()`, and `originAllowed()`.

The rate-limit Map is local to one function instance. It cannot enforce one shared quota across instances, and expired keys are never removed. Requests without an Origin are allowed, so the origin check does not stop direct scripts. A honeypot helps against unsophisticated bots but does not establish a dependable sending limit.

**Recommendation:** if the form is publicly enabled, use a shared or deployment-layer limit with a verified client identifier, bound any in-memory state, and monitor sending failures and volume. Return useful retry guidance for throttled visitors. Keep the present server-side token handling and plain-text email body.

**Acceptance checks:** changing function instances does not bypass the intended overall limit, expired limiter entries are bounded or removed, and normal visitors retain the direct email option. Avoid logging message bodies or credentials during diagnosis.

### R10 — P3: Refine semantics, typography delivery, and small controls

**Status:** Source-supported improvements with limited visual sampling.  
**Evidence:** [SectionHead](../../src/lib/components/SectionHead.svelte), [MenuBar](../../src/lib/components/MenuBar.svelte), [layout imports](../../src/routes/+layout.svelte), and [CSS](../../src/app.css).

`SectionHead` always emits an `h2`; Work and Contact had no `h1` in the browser DOM. The motion toggle has an accessible name but no visible label or explanatory tooltip. The global DotGothic16 import generates many font assets, while its `--font-ja` token has no usage found in the current source. Build asset count is not equivalent to actual downloaded bytes, so no network-size saving is claimed here.

**Recommendation:** allow route headings to render as `h1` while homepage section headings stay `h2`. Add a visible or discoverable explanation for the motion control. Audit font use and import only needed subsets or weights. Give the three featured cards a dedicated grid that uses the available width; the desktop sample left a conspicuous empty column beside them.

**Acceptance checks:** each route has a clear main heading, the motion control is understandable without guessing its icon, featured cards balance across the desktop row, and a browser network comparison confirms any font reduction. Preserve existing focus styling and mobile menu behavior.

### R11 — P3: Reconcile documentation and add a small release gate

**Status:** Confirmed documentation drift and missing repository automation.  
**Evidence:** [README](../../README.md), [package scripts](../../package.json), [static assets](../../static), and the absence of `.github` workflows in this checkout.

The README still describes `TODO(CV)` placeholders despite populated content, promises fallback behavior that differs from the code, and the adapter comment says sitemap and robots files are static although neither appears in `static/`. These mismatches make maintenance less predictable.

**Recommendation:** update documentation to match tested behavior and remove obsolete claims. Add CI for clean installation, frontend checking, API checking, focused behavior tests, and the production build. Add route-specific sharing metadata, canonical URLs, a sitemap, and robots guidance if public discovery is an intended goal. Treat those as publishing improvements rather than emergency defects.

**Acceptance checks:** a fresh clone follows the README successfully; CI covers both frontend and API; documentation describes static freshness and platform limitations accurately; any new discovery assets resolve in the built output.

## Suggested delivery sequence

| Stage | Work | Completion signal |
|---|---|---|
| 1 — Protect the contact task | R1, R2, R4 | Drafts survive failures; errors are actionable; API checks run independently |
| 2 — Establish project credibility | R3, R5, R8 | Three persuasive project stories lead; archive and counts are honest |
| 3 — Make external dependencies predictable | R6, R7, R9 | Partial failures, bounded waits, freshness, and sending limits behave deliberately |
| 4 — Refine and document | R10, R11 | Semantics, controls, grid, font delivery, and maintenance guidance are verified |

No framework migration, CMS, elaborate search system, or new visual identity is warranted by the evidence collected. The current stack can support these improvements.

## Suggested verification matrix

- **Contact:** mocked success, malformed email, server field errors, HTTP 404/429/502, timeout, unexpected success payload, missing configuration, and honeypot behavior. Verify that none of the automated cases sends email.
- **GitHub:** all accounts succeed; one fails; all fail; request hangs; cache is missing, partial, stale, or corrupt. Check both data and visitor-facing labels.
- **Navigation and accessibility:** keyboard access from the skip link through the mobile menu and form; visible focus; field-error associations; meaningful heading structure; motion off from initial load.
- **Presentation:** review home, work, contact, and CV at narrow and wide widths in both themes. Check long project names, empty descriptions, the actual print output, and the CV download.
- **Performance:** measure a representative deployed page before optimizing. Keep the existing offscreen/hidden-tab animation suspension; do not remove it in a visual cleanup.

## Run notes

- **Stable critique target:** `src/routes/+page.svelte`; helper slug: `src-routes-page-svelte`. Technical review extended to the files linked above.
- **Ignore list:** `.impeccable/critique/ignore.md` was absent.
- **Assessment independence:** unavailable by user choice; both passes ran in this chat, with design judgment recorded before detector output.
- **Detector:** one source scan; no findings or false positives returned. Its clean result does not contradict the manually identified problems because it does not establish contact delivery, content quality, or cache correctness.
- **Browser visibility:** review stayed in the background. No user-visible overlay was created. Browser evaluation is read-only, so mutable script injection was not attempted; direct screenshots and DOM observations supplied the fallback evidence.
- **Cleanup:** no detector overlay server was started; the review-only Vite job was cancelled, temporary tabs were closed, the viewport override was reset, and the original dark theme preference was restored. No temporary report-body file was used.
- **Deliverable:** this standalone Markdown report is saved in the separate folder requested by the user. Application source was not edited. No historical score trend is asserted.
- **Questions skipped:** the requested deliverable is a standalone report; choosing and implementing fixes is outside this report’s scope.
