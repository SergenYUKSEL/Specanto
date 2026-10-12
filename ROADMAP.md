# Specanto roadmap

Status checked against the current code and verification results on 12 October 2026. The first functional delivery is available; the items below are remaining work, not shipped features.

## Delivered first slice

- [x] React library, exported CSS and TypeScript declarations, installable as a local archive.
- [x] JSON/YAML/object/URL input, bounded OpenAPI 3.1.x normalization and internal references.
- [x] Search, operation links, documentation, request preparation and real HTTP responses.
- [x] Bearer and API-key header construction, memory-only credentials, origin binding and redacted cURL.
- [x] Responsive operation screen, light/dark themes and SVG icons.
- [x] Fictional Atelier API, stateless demo server, public showcase and Railway CLI deployment.
- [x] 103 unit/integration tests, 17 browser checks and a clean packaged consumer build verified locally.

## Priority 1: finish the MVP integration options

- [ ] Allow the integrator to provide a custom logo/brand mark on desktop and mobile. The API title is configurable; the Specanto wordmark is currently fixed.
- [ ] Expose a validated request-timeout option. The request panel currently uses a fixed 45-second timeout.
- [ ] Document customization of both reading and monospace families through the existing scoped `--sp-` tokens, including examples that keep styles isolated from the host application.

## Priority 2: complete the verification coverage

- [ ] Add browser journeys for 204, 400, 401 and 500 responses, cancellation during an active request, timeout and network failure.
- [ ] Exercise API-key authentication, simulation/custom transport, unsafe Markdown links, empty search, long paths and large responses through the UI.
- [ ] Pin the advertised client-validation constraints with direct tests: enum, nullable values, numeric boundaries and array-length boundaries.
- [ ] Run Chromium and WebKit mobile checks reproducibly in the browser suite. The WebKit/iPhone verification has currently been performed separately.
- [ ] Keep a small integration example in the repository, verify exported types and test the React versions advertised by the peer-dependency range. The current temporary consumer exercises React 19.3.0.

## Priority 3: automate the checks

- [ ] Add GitHub Actions for lint, TypeScript, tests, both builds, packaged consumer integration and browser journeys.
- [ ] Define a release procedure with versioning, changelog, archive checks and manual npm publication. Railway deployment currently uses the CLI.

## Priority 4: prepare public package distribution

- [ ] Choose the project license and add the adopted root LICENSE. MIT is only prepared as a proposal in `docs/LICENSE-MIT.proposed.txt`.
- [ ] Verify the package name/scope and publication access, complete package metadata, then remove `private` only when publishing is explicitly authorized.
- [ ] Review dependency/font licenses and prepare any required attribution for distribution.
- [ ] Establish a real private security-reporting channel and update SECURITY.md.
- [ ] Add README screenshots and the first changelog entry, then publish the approved package to npm for registry-based Bun/npm/pnpm installation.

## Later, optional scope

More complete JSON Schema validation, additional OpenAPI versions, external references, OAuth/OIDC, multipart, streaming and multi-API portals are outside the initial MVP. They can be prioritized from actual integration needs; they are not prerequisites for releasing the documented subset.

See [compatibility](./docs/compatibility.md) for current limitations and [delivery evidence](./docs/delivery.md) for commands and observed results.
