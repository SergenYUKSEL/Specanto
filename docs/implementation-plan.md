# Specanto implementation plan

**Goal:** Deliver the first usable API reference, an installable local React package and a live, controlled demo.

**Architecture:** A React-independent engine, scoped component UI, shared fixture and a stateless Bun demo server. The demo imports the public library entry.

**Reference:** [Design](./design.md) and the product brief of 12 October 2026.

## Work and verification

- [x] Scaffold Bun manifests, strict TypeScript, linting and separate Vite library/demo builds. Preserve the existing README and deployment target.
- [x] Define the public contracts in `src/core/types.ts`. Implement parser, normalization, search, schema examples, request construction, cURL and HTTP transport in `src/core`. Write failing behavioral tests first, then run `bun test tests/core.test.ts` and implement the covered behaviors.
- [x] Implement `ApiReference` in `src/ui`, with navigation, operation reading and manual request panel. Render untrusted Markdown safely and handle empty, invalid and loading input. Browser tests must catch automatic business calls, lost deep links, credential leakage and global overflow.
- [x] Create `fixtures/atelier.openapi.json` and `server/api.ts`, with GET products, GET product and stateless POST order. Test real request/response contracts and unknown IDs/invalid order bodies in `tests/server.test.ts` before implementing handlers.
- [x] Integrate the reference screen in `demo`, then create a short product showcase linking to `/demo`. Add import from file/URL, theme controls and fixture reset. Build/start via Bun; serve static assets with traversal protection and a health endpoint.
- [x] Run `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`, a clean packaged consumer build and Playwright journeys at 390/768/1440px. Inspect screenshots and correct visual defects.
- [x] Document installation, compatibility limits, safe demo behavior and contribution commands. Prepare MIT text for author review without publishing the package.
- [x] Create a demo service in the specified Railway project/environment, deploy with explicit scope, observe the deployment's SUCCESS status and check the public homepage, demo and API.

## Review focus

Unknown versions and nonlocal/cyclic references must never silently fabricate compatibility. Relative servers from imported files require an explicit base. Security alternatives and origin changes must not leak credentials. Long paths/large responses must not overflow or lock the page. The built package must work without development aliases.
