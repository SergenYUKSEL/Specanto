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

## MIT and OpenAPI 3.0 release candidate — 13 October 2026

The author approved the recommended MIT + npm + OpenAPI 3.0 lot. The root LICENSE is adopted, the proposal file is removed, SPDX metadata is set and public npm publish configuration selects the official registry. The package stays at the unreleased version `0.1.0` because no registry version has been published.

The parser now accepts OpenAPI 3.0.x and 3.1.x JSON/YAML/object/URL inputs. 3.0 nullable schemas normalize to the common type representation without widening enum restrictions; reference siblings follow 3.0 rules. Resolved source schemas remain inspectable. Boolean exclusive-bound flags normalize for comparison but remain outside the partial client validator with a warning. `NormalizedSpec.openapiVersion` records the source version, shown in the reference. Mixed-version comparisons use normalized schemas.

| Candidate check | Observed result |
| --- | --- |
| Frozen installation, lint, TypeScript, whitespace and notices | Passed; 88 dependency/font packages verified |
| Unit/integration suite | 245 passed, including nullable, reference, source preservation and mixed-dialect comparison cases |
| Library and demo builds | Passed |
| `CI=true bun run test:e2e` | 118 passed on Chromium and WebKit iPhone, including 3.0 import, YAML URL loading and mixed-version comparison |
| Exact candidate archive | 42 files, root MIT LICENSE, SPDX/public registry metadata, JS/CSS/declarations; no demo/server/fixture files |
| `SPECANTO_CONSUMER_TARBALL="output/specanto-react-0.1.0.tgz" bun run check:consumer` | React 18.2/19.3 strict types, build, runtime exports, 3.0 parser and CSS passed |
| `npm publish ./output/specanto-react-0.1.0.tgz --dry-run --access public --registry https://registry.npmjs.org/` | Candidate accepted; npm warned that authentication is needed; no publication performed |

The CLI reports `ENEEDAUTH` for `npm whoami`, and the author confirmed that no npm account exists yet. The package lookup returns 404, which does not establish ownership or availability of the `@specanto` scope. The candidate is ready for account setup and scope verification; no account, organization, registry version, tag or GitHub release was created. The release guide includes the exact-archive publication and post-publication verification steps.

GitHub CI run `38366349782` for candidate commit `334860a` was blocked before any step started. Its annotation reports an account payment failure or spending limit requiring review in Billing & plans. The local checks passed; no GitHub success or billing change is claimed.

Railway deployment `52dd235b-ee8d-43b8-a2cf-7a438022f533` reached **SUCCESS** on the existing production service. Twenty-two selected browser journeys passed against the public site on Chromium and WebKit iPhone, covering 3.0 JSON import/nullable requests through a controlled intercepted endpoint, 3.0 YAML URL loading, mixed 3.0/3.1 comparisons, responsive layouts, navigation and real Atelier GET/POST. Public pages, health, OpenAPI and products returned HTTP 200; the page references the locally verified production bundle. No new Railway project or service was created.

## npm publication — 13 October 2026

The author created the npm account and `specanto` organization, then enabled 2FA. The CLI authenticated as `sergenyuksel`, and `npm org ls specanto` confirmed the owner role. Interactive web authentication authorized publication of the exact reviewed archive as `@specanto/react@0.1.0` with public access.

Registry version, MIT license, `latest` tag and integrity were verified against the archive. Clean consumers installed version `0.1.0` from the registry with React 18.2 and 19.3; strict TypeScript contracts, runtime exports, the OpenAPI 3.0 parser, Vite builds and exported CSS passed. The registry tarball matches the reviewed artifact. These checks verify registry integration; the candidate’s full unit/browser results remain recorded above.

The immutable archive retains the candidate-era documentation. This repository follow-up documents the completed release without repacking or replacing version `0.1.0`. No credentials were added to the repository, no GitHub release/tag was created and no demo redeployment was required.

## Local Express onboarding — 0.2.0

The author approved a local starter and Express integration guide after an external integration attempt suggested swagger-jsdoc was required. The optional `specanto init` executable creates a separate Vite React application, an editable OpenAPI file and a fixed-target proxy. It neither scans backend source nor installs dependencies. Existing target directories/symlinks are refused, API origins are validated before filesystem writes, and the generated dev server listens on loopback.

The guide covers manual route descriptions, existing documents, Bearer authentication, relative server resolution, cookie/document-loader limitations and production hosting. No Express dependency was added to the library; the verification runner installs Express 5.3.0 only in its temporary integration host.

Verification: lint, strict TypeScript, notices and both builds passed; 261 unit/integration tests passed. The packaged starter was created through the documented bunx package/bin command, built and exercised against a real Express backend without CORS on Chromium and WebKit iPhone. Manual GET rendered the response; a browser POST verified JSON and Authorization forwarding through the proxy. Initialization itself and initial page load sent no backend recipe request. The fresh production-build reference suite passed all 118 browser checks, and clean React 18.2/19.3 consumers passed strict contracts, runtime exports and CSS/build checks from the 0.2.0 archive. The two starter browser journeys are recorded separately from those 118 checks. Version `@specanto/react@0.2.0` was published after interactive npm web authentication. The registry’s MIT license, latest tag, executable metadata and SHA-512 integrity were verified, and the downloaded 45-file archive is identical to the reviewed candidate from `de60ac0`. Clean registry consumers passed with React 18.2/19.3. The documented bunx/npx commands created new apps, and the registry-installed starter passed its real Express/browser checks again. The archive retains the candidate-era publication notes; this repository records the completed release without replacing the published version. Demo runtime assets are unchanged; no Railway deployment is required for this CLI/documentation update.

GitHub CI run `38373688440` for source commit `de60ac0` was blocked before any step started. Its annotation reports an account payment failure or spending limit requiring review in Billing & plans. Local verification passed; no successful GitHub run or billing change is claimed.

## Generic starter examples — 0.2.1

Public README and Express-guide commands now use the generic `api-docs` directory. The library remains `@specanto/react`; the CLI names each generated private application after the integrator’s chosen directory. Source commit `92f56ae` prepares the correction without changing the library JS/CSS or CLI implementation.

The 16 CLI tests passed, and the packaged starter built and exercised its real Express proxy on Chromium and WebKit. Version 0.2.1 was published after interactive npm authentication. Registry version, MIT license, latest tag and downloaded archive bytes were verified; the registry CLI creates a private `api-docs` app depending on 0.2.1. The npm website was refreshed and visibly showed version 0.2.1 and the generic initialization command, without the earlier project-specific example name. The published archive is preserved; no demo redeployment was required.

## Distribution and remaining scope

The current local archive is `output/specanto-react-0.2.1.tgz`. It contains JS, CSS, TypeScript declarations, the optional CLI, the adopted MIT LICENSE and integration/compatibility documentation. The package is published publicly as `@specanto/react@0.2.1` on npm; earlier published artifacts are also preserved.

The author approved MIT, OpenAPI 3.0 support and npm publication. Registry publication is complete; applications can install with `bun add @specanto/react` independently of the demo deployment. Advanced JSON Schema validation, external references, OAuth/OIDC, multipart, streaming and multi-API portals remain outside this release. The [compatibility matrix](./compatibility.md) records the current behavior and protection limits.

The [roadmap](../ROADMAP.md) records shipped integration options, verification and CI, completed npm distribution, and the six [delivered feature extensions](./features.md).
