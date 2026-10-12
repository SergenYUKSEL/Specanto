# Specanto roadmap

Status checked against the current code and verification results on 13 October 2026. The functional MVP, integration options and all six proposed feature additions are implemented in the repository. Remaining distribution decisions are listed separately from shipped features.

Verification: 224 unit/integration tests, 106 Chromium/mobile WebKit checks against the production build, and the React 18.2/19.3 packaged consumer checks passed.

## Delivered first slice

- [x] React library, exported CSS and TypeScript declarations, installable as a local archive.
- [x] JSON/YAML/object/URL input, bounded OpenAPI 3.1.x normalization and internal references.
- [x] Search, operation links, documentation, request preparation and real HTTP responses.
- [x] Bearer and API-key header construction, memory-only credentials, origin binding and redacted cURL.
- [x] Responsive operation screen, light/dark themes and SVG icons.
- [x] Fictional Atelier API, stateless demo server, public showcase and Railway CLI deployment.
- [x] 224 unit/integration tests, 106 Chromium/mobile WebKit checks, and React 18.2/19.3 packaged consumers with strict TypeScript verification.

## Priority 1: finish the MVP integration options

- [x] Custom desktop/mobile logo through `logo`, with the Specanto wordmark as the default.
- [x] Validated `requestTimeoutMs` option, default 45 seconds, accepted range 100–300,000 ms.
- [x] Reading and code font props, scoped CSS examples and [customization documentation](./docs/customization.md).

## Priority 2: complete the verification coverage

- [x] Add browser journeys for 204, 400, 401 and 500 responses, cancellation during an active request, timeout and network failure.
- [x] Exercise API-key authentication, simulation/custom transport, unsafe Markdown links, empty search, long paths and large responses through the UI.
- [x] Pin the advertised client-validation constraints with direct tests: enum, nullable values, numeric boundaries and array-length boundaries.
- [x] Run Chromium and WebKit mobile checks reproducibly in the browser suite. Both browsers are part of the checked-in suite.
- [x] Keep a small integration example in the repository, verify exported types and test the React versions advertised by the peer-dependency range. The permanent Vite example is verified from an archive with React 18.2 and 19.3, including strict public type contracts.

## Priority 3: automate the checks

- [x] Add GitHub Actions for lint, TypeScript, tests, both builds, packaged consumer integration and browser journeys.
- [x] Define a release procedure with versioning, changelog, archive checks and manual npm publication. Railway deployment currently uses the CLI.

## Priority 4: prepare public package distribution

- [ ] Choose the project license and add the adopted root LICENSE. MIT is only prepared as a proposal in `docs/LICENSE-MIT.proposed.txt`.
- [ ] Verify the package name/scope and publication access, complete package metadata, then remove `private` only when publishing is explicitly authorized.
- [x] Review dependency/font licenses and prepare any required attribution for distribution.
- [x] Establish a real private security-reporting channel and update SECURITY.md.
- [x] README desktop/mobile screenshots and the first unreleased changelog entry.
- [ ] Publish an explicitly approved package to npm for registry-based Bun/npm/pnpm installation.

## Delivered feature additions

- [x] Current-form cURL/Fetch/Python examples with secret-header redaction and copy actions.
- [x] Integrator-provided server profiles with selection across operations, origin-bound credential clearing and active-request cancellation.
- [x] Guided JSON editor with first-error field paths, manual literal-preserving formatting and manual authored/generated examples.
- [x] Local specification comparison with operation, parameter, primary-media, schema and authentication changes; potentially breaking classifications, filters and visible traversal/result limits.
- [x] Memory-only history of the latest 20 request outcomes and up to 100 operation favorites. History retains operation templates and result metadata, excludes submitted parameters/headers/bodies, and only navigates back to documentation.
- [x] Configurable French/English interface, known validation diagnostics, session controls and comparison screen, while preserving the language of OpenAPI-authored content.

All six original feature proposals are implemented. Their current behavior and boundaries are described in the [feature overview](./docs/features.md).

## Later, optional scope

More complete JSON Schema validation, additional OpenAPI versions, external references, OAuth/OIDC, multipart, streaming and multi-API portals are outside the initial MVP. They can be prioritized from actual integration needs; they are not prerequisites for releasing the documented subset.

See [compatibility](./docs/compatibility.md) for current limitations and [delivery evidence](./docs/delivery.md) for commands and observed results.
