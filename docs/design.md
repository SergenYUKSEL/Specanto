# Specanto first delivery

The product brief dated 12 October 2026 is the reference. The first delivery is an executable React library and an original, responsive API operation screen, backed by a real OpenAPI 3.1.1 fixture and a controlled HTTP demo. The user approved starting this work and selected Railway CLI deployment to project `e7e1ab33-b677-4537-bb14-c43201359ef5`, environment `a1e0cb54-c0a1-481e-92b4-7853b4c8d561`.

## Architecture

One simple package: `src/core` has no React dependency; `src/ui` renders the normalized model; `src/styles` exposes scoped `--sp-` tokens. `demo` consumes the public library entry. `fixtures` supplies the fictional Atelier shop API. `server` serves a stateless, controlled shop API and the built demo on Railway; it is not required by the library. React is a peer dependency and external to the library bundle. Public props accept exactly one of `spec` and `specUrl`.

## Visual direction

Paper `#F6F5F0`, ink `#181818`, coral `#FF5A36`, muted `#62635E`, rule `#DEDED6`, code surface `#EFEFE9`. Coral buttons use dark text for contrast. Archivo Variable carries the wordmark and interface; IBM Plex Mono carries paths and code. These are reversible starting choices, not a final brand charter.

The operation screen has a 248px navigation, flexible reading column and 400px request panel. The remembered detail is the expressive lowercase wordmark, with quiet rules and compact technical information around it. Below 1100px the test panel follows the documentation; mobile uses collapsible navigation. Dark mode has its own tokens. Controls have visible focus and named actions.

## Functional slice

Load JSON/YAML or a supplied object; reject unknown OpenAPI versions; support internal references with bounded traversal. Search and stable hash links select real operations. Render descriptions safely, input parameters, request JSON, response examples and schema properties. Construct scalar path/header and simple form query parameters, Bearer/API-key header credentials and a visible final destination. Execute only after a manual action, with cancellation and timeout. Keep credentials in memory, bind them to an origin, clear on destination change, redact cURL by default, reject credentialed redirects. Advanced schema constructs remain source-visible; unsupported request serialization blocks execution.

The fictional API exposes GET /products, GET /products/{id} and POST /orders. Orders are echoed with deterministic demo identifiers and never stored. The UI labels it a demo API; calls are real HTTP, not a simulated transport. No accounts, database, cloud dependency, proxy, SDK generator or package publication.

## Verification and deployment

Core tests cover parsing, references, encoding, relative URLs, inherited/alternative auth, invalid request data, secret origin binding and cURL redaction. Controlled server tests cover successful GET/POST and validation errors. Browser checks exercise import, search, navigation, request/response, dark mode, keyboard and layout at 390, 768 and 1440px. A clean consumer imports the built package and CSS without internal aliases. Lint, type checking, tests and builds must pass before Railway deploy; deployment and HTTP health are verified afterward.
