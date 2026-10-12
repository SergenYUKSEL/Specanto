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

## Distribution and remaining scope

The local archive is `output/specanto-react-0.1.0.tgz`. It contains JS, CSS, TypeScript declarations and integration/compatibility documentation. The package name is provisional and the manifest stays private.

Publication to npm, adopting the proposed license, final brand decisions and the broader roadmap remain separate decisions. Advanced JSON Schema validation, external references, OAuth/OIDC, multipart, streaming and multi-API portals are outside this release. The [compatibility matrix](./compatibility.md) records the current behavior and protection limits.

The [roadmap](../ROADMAP.md) separates remaining MVP integration options, verification gaps, CI and publication preparation from optional future scope.
