# First delivery — 12 October 2026

The first implementation is executable, packaged and deployed. This is a bounded OpenAPI 3.1.x implementation, not a claim of full OpenAPI or JSON Schema compatibility.

## Delivered

- `src/core`: JSON/YAML loading, internal references, normalized operations, search, schema inspection and partial validation, request construction, origin-bound credentials, cURL and bounded browser HTTP transport.
- `src/ui` and `src/styles`: original responsive reference, keyboard search, stable operation links, input controls, manual request/response, copy confirmations, explicit secret clearing, dark mode and simulation labels.
- `fixtures`: fictional Atelier OpenAPI 3.1.1 with products and orders.
- `server`: stateless controlled HTTP API, static hosting, bounded request bodies and healthcheck.
- `demo`: public showcase and usable reference, file/URL import and theme control. The demo imports the library's public entry and its shared stylesheet.
- Root manifests/configuration: Bun lockfile, strict TypeScript, lint, separate library/demo builds, Dockerfile and production/browser checks.
- Documentation: English/French setup, integration, contribution, compatibility and security documents; a proposed MIT text for author review.

## Executed verification

| Command or check | Observed result |
| --- | --- |
| `bun install --frozen-lockfile` | Dependency lock accepted |
| `bun run lint` | Passed |
| `bun run typecheck` | Passed |
| `bun run test` | 103 tests passed |
| `bun run build` | React library, declarations, CSS and demo built |
| `bun run check:consumer` | A separate consumer installed the archive and built using the public JS/CSS exports |
| `bun run test:e2e` | 17 browser checks passed |
| `docker build -t specanto-demo:0.1.0 .` | Production container built |
| Browser suite against the production container | 17 checks passed, including desktop column layout and mobile overflow |
| Browser checks against the public deployment | 5 checks passed: homepage navigation, real GET/POST, 390px and 1440px layouts |
| Public `/`, `/demo`, `/health`, `/openapi.json`, `/api/products` | HTTP 200 |
| `git diff --check` | Passed |

Core tests use controlled HTTP servers as well as the pure request builder. Response HTML is rendered as text, schema faults stay usable import errors, and boolean schemas retain their source. An independent review's three findings were corrected and verified.

## Railway release

- Project: `e7e1ab33-b677-4537-bb14-c43201359ef5` (`agile-dream`).
- Environment: `a1e0cb54-c0a1-481e-92b4-7853b4c8d561` (`production`).
- Service: `ac4e2b9e-b881-45bc-b75f-34d4952b9bc1` (`specanto-demo`).
- Deployment: `1f70ddd4-fc6d-45aa-ab95-b4a2aad41571`; Railway status **SUCCESS** observed.
- [Showcase](https://specanto-demo-production.up.railway.app) and [demo](https://specanto-demo-production.up.railway.app/demo).
- Bun 1.3.14 Docker build; `PORT=3000`; `/health` startup check. No database or retained orders.

The release was uploaded from this checkout using the Railway CLI with explicit project/environment/service IDs. Railway deployment is separate from GitHub source synchronization. No npm publication has been performed.

### Mobile icon follow-up

Decorative text glyphs were replaced with shared inline SVGs in `src/ui/Icon.tsx`, the reference and the demo/showcase. Arrows, theme controls, close controls, disclosure signs and the wordmark symbol now render independently of platform emoji fonts. Accessible action labels are preserved. Lint, types, both builds and 17 browser checks passed; the production build was also inspected with WebKit in iPhone 13 emulation. The local package archive was refreshed.

Railway deployment `6537e09e-65cb-498b-ab09-1f2ca709a350` was observed with status **SUCCESS** on the same service and environment.

## MVP integration and verification follow-up

The integrator can now provide a desktop/mobile `logo`, `monoFontFamily` and validated `requestTimeoutMs`. The timeout defaults to 45,000 ms and accepts integers from 100 to 300,000 ms. Invalid configuration blocks execution. Timeout/cancellation ignore late transport completions.

The permanent `examples/consumer-vite` application installs the real package archive without source aliases. The consumer runner checks React 18.2.0 and 19.3.0 with matching type definitions, strict public type contracts, runtime parser/component imports, Vite builds and exported CSS. A Node import issue was corrected by leaving `react-markdown` and `yaml` as runtime dependencies so each environment resolves its own entry points. Only the initial loading state is rendered in the server smoke check; hydration and server-rendered documentation are not promised. The library build excludes demo public assets.

| Follow-up check | Observed result |
| --- | --- |
| Frozen installation, lint and TypeScript | Passed |
| Unit/integration suite | 120 passed |
| Runtime/font notice verification | 88 packages verified |
| Library and demo production builds | Passed |
| Packaged consumer matrix | React 18.2 and 19.3 passed |
| Local browser suite | 72 passed across Chromium and WebKit iPhone |
| `CI=true bun run test:e2e` against the production build | 72 passed |
| Public Railway browser checks | 12 passed: responsive layouts, navigation and real GET/POST on both browsers |
| Public pages, health, products and font-license endpoints | HTTP 200 |
| Staged secret scan and whitespace checks | No findings / passed |

GitHub Actions automates the checks and tests the production demo build; the separate browser fixture host is excluded from deployment and the package. The release procedure stays manual. README captures, the unreleased changelog and dependency/font notices are included. GitHub private vulnerability reporting is enabled and linked from SECURITY.md.

Railway deployment `a6f724b4-5748-4ced-a230-7fdaa1e495b2` was observed with status **SUCCESS** on the same project/environment/service. It includes the integration options and public font-license texts. Later library archive/documentation cleanup does not alter demo runtime behavior.

## Console feature follow-up

Three requested extensions are implemented: cURL/Fetch/Python code selection and copying, server profiles supplied by the integrator independently of OpenAPI, and a guided JSON editor. Profile selection survives operation navigation; changing the destination cancels the active request, and changing origins clears credentials. Importing a local document returns to its declared servers.

JSON formatting is manual and preserves number literals, escapes and duplicate keys. Diagnostics reuse the existing partial request validator and show its first field-path error. Authored examples take precedence over generated examples. Snippets redact known secret headers, preserve body content and are never executed by the component. Python uses Requests with a connect/read timeout, distinct from the UI's total request timeout.

Verification: 175 unit/integration tests passed, 86 Chromium/mobile WebKit checks passed against the production demo build, and the packaged consumers passed with React 18.2 and 19.3. The consumer check includes the new profile type, snippet exports and guided-editor CSS. Desktop/mobile screenshots were refreshed. An independent review identified an isolated UTF-16 surrogate case in Python output; it was reproduced, corrected and tested. Sparse profile arrays are also rejected rather than causing a rendering failure.

Railway deployment `c5154620-19e4-49f0-8263-1ebf02f4fa5a` reached **SUCCESS**. Sixteen selected browser journeys passed against the public demo (plus two isolated snippet-copy fixture checks), covering real GET/POST, responsive layouts, file import and JSON actions. Public Fetch/Python secret-header redaction was additionally checked with Chromium and WebKit iPhone.

GitHub CI run `38310775016` was blocked before any step started. GitHub's annotation reports a recent account payment failure or a spending limit requiring review in Billing & plans. The local checks passed; this follow-up does not claim a successful GitHub run and makes no billing changes.

Specification comparisons, session history/favorites and configurable FR/EN labels were the next feature proposals at that point. They are implemented in the follow-up below. No npm publication or license adoption is included.

## Comparison, session and language follow-up — 13 October 2026

The three remaining proposals are implemented. `SpecComparison` reads two local OpenAPI 3.1 JSON/YAML documents, groups and filters additions, removals, potential incompatibilities and other changes. `compareSpecs` is exported for normalized documents. The report names fields that become required and treats newly documented response statuses on an existing operation as potentially breaking. Its bounded, partial comparison is not a full compatibility certificate; unsupported semantics and incomplete traversal produce review notes.

The reference offers up to 100 operation favorites and the latest 20 completed/cancelled/failed request metadata entries. History retains the operation's template path, server origin, status/outcome, timestamp and duration, excluding parameter values, headers, bodies, responses and full URLs. Opening an entry navigates to documentation without replaying it. Import, specification replacement, unmount and reload discard the session. No browser storage is used.

`locale="fr" | "en"` configures interface labels and known diagnostics, with French as the default. Changing language retains the active form and pending request. Authored OpenAPI content remains unchanged. The demo includes a language control and a separate `/compare` screen; all decorative controls continue using SVG icons.

| Follow-up check | Observed result |
| --- | --- |
| Frozen installation, lint, TypeScript and whitespace | Passed |
| Unit/integration suite | 224 passed |
| Runtime/font notice verification | 88 packages verified |
| Library and demo production builds | Passed |
| Packaged consumer matrix | React 18.2 and 19.3 passed, including comparison/locale exports and session/comparison CSS |
| `CI=true bun run test:e2e` against the production build | 112 passed across desktop Chromium and WebKit iPhone |

Browser coverage includes comparison filters and localized field changes, translated import errors, favorite clearing, metadata-only history and navigation without replay. An isolated StrictMode host verifies locale changes during requests, cancellation, spec replacement, file import, unmount and ignored late completions. Desktop/mobile previews and new comparison/session screenshots are included.

Public checks exposed an import race: an initial URL document completing after a file import could remove its diagnostic or overwrite a valid imported document. Deferred-source regressions reproduced both failures on Chromium and WebKit. The correction preserves failed-import diagnostics, cancels superseded URL loads and ignores obsolete file reads. A third regression checks competing file reads. All six new browser cases passed in the production suite. Real HTTP history assertions use the numeric status because HTTP/2 responses can omit status text.

The staged secret scan reported no findings. The refreshed local archive contains 42 files, the comparison/locale declarations and session/comparison styles, with no demo server, browser fixtures or bundled fonts. Its manifest remains private.

GitHub CI runs `38314545349` for commit `ea1c1ce` and `38315239497` for corrected source commit `dc42f5f` were blocked before any step started. Their check annotations again report an account payment failure or spending limit requiring review in Billing & plans. Local verification passed; no successful GitHub run or billing change is claimed.

Railway deployment `245f9010-2c67-4e43-b2ee-88500690ca70` reached **SUCCESS** on the same project, production environment and service. Thirty selected browser journeys passed against the public service on Chromium and WebKit iPhone: comparison/locale/session actions, all three import-race regressions, responsive layouts, navigation and real GET/POST. Additional checks on both browsers verified the English comparison screen, its actual dark stylesheet, lack of horizontal overflow and absence of runtime errors. Public `/`, `/demo`, `/compare`, `/compare/`, `/health`, `/openapi.json` and `/api/products` returned HTTP 200; the page references the verified corrected production bundle.

## Distribution and remaining scope

The local archive is `output/specanto-react-0.1.0.tgz`. It contains JS, CSS, TypeScript declarations and integration/compatibility documentation. The package name is provisional and the manifest stays private.

Publication to npm, adopting the proposed license and control of the npm scope remain separate decisions. The completed integration/verification work and proposed extra features are recorded in the roadmap. Advanced JSON Schema validation, external references, OAuth/OIDC, multipart, streaming and multi-API portals are outside this release. The [compatibility matrix](./compatibility.md) records the current behavior and protection limits.

The [roadmap](../ROADMAP.md) records shipped integration options, verification and CI, remaining publication decisions, and the six [delivered feature extensions](./features.md).
