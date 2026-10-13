# Changelog

## 0.1.0 — 13 October 2026

Published publicly on npm as `@specanto/react`.

### Added

- OpenAPI 3.0.x JSON/YAML/object/URL input, nullable schema normalization, 3.0 reference-sibling semantics and source-version display; mixed 3.0/3.1 comparisons use normalized schemas.
- Adopted root MIT license and public npm publication metadata. Published publicly as `@specanto/react@0.1.0` after scope ownership and interactive 2FA verification.
- Local JSON/YAML specification comparison through `SpecComparison` and `compareSpecs`, with request/response-aware change classifications, review filters and explicit comparison limits.
- Memory-only session history for the latest 20 request outcomes and up to 100 operation favorites, with explicit clearing and reset on specification import or reload. History excludes submitted parameters, headers and bodies; opening an entry only navigates to its documentation.
- Configurable French/English reference UI, known validation diagnostics, session controls and comparison screen. OpenAPI-authored content stays in its original language.
- cURL/Fetch/Python selector with current-form examples, secret-header redaction and copy actions.
- Integrator-defined server profiles that persist across operations, with credential clearing on origin changes and cancellation on destination changes.
- Guided JSON body editor with field-path diagnostics, manual formatting that preserves literals and manual example insertion.
- Reusable React reference with OpenAPI 3.0.x/3.1.x JSON/YAML/object/URL input, internal references, search and stable operation links.
- Manual HTTP console with parameters, JSON bodies, Bearer/API-key headers, origin-bound credentials, cancellation, timeout and redacted cURL.
- Responsive editorial interface, light/dark modes and inline SVG icons.
- Fictional, stateless Atelier API, showcase and Railway-hosted demo.
- Configurable desktop/mobile logo, reading/code font families and validated request timeout.
- Chromium/mobile WebKit checks, React 18/19 packaged consumer example, GitHub CI and private vulnerability reporting.
- Library declarations/CSS exports, contribution and compatibility documentation, and local archive installation.

This MIT-licensed version is available from [npm](https://www.npmjs.com/package/@specanto/react), the repository and the verified local archive.
