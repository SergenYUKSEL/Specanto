# Compatibility — Specanto 0.1.0

This is a bounded first implementation of an OpenAPI reference and browser HTTP client. Parsing a document does not certify that it conforms to OpenAPI, and the request validator is not a complete JSON Schema validator.

## Documents and display

| Feature | Current behavior |
| --- | --- |
| OpenAPI versions | `3.0.x` and `3.1.x`, where the patch is numeric. Swagger 2, OpenAPI 3.2 and malformed versions are rejected. `NormalizedSpec.openapiVersion` records the source version separately from `info.version`. |
| OpenAPI 3.0 schemas | The supported schema subset is normalized for the common engine. `nullable: true` adds `null` only when the same schema explicitly declares a type; enum restrictions still apply. Resolved source schemas remain available for inspection. |
| OpenAPI 3.0 references | Resolved `$ref` siblings are ignored with a warning. 3.1 retains the existing sibling behavior. Unresolved/external/cyclic references retain the existing execution restrictions; no remote reference is fetched. |
| OpenAPI 3.0 exclusive bounds | Boolean exclusive flags are normalized to numeric constraints when their inclusive bound exists. These exclusive constraints remain outside the partial client validator and are warned about. False/orphan flags have no effect. |
| Dialect shape checks | 3.0 rejects type arrays, `type: null`, boolean schemas outside `additionalProperties`, and malformed nullable/exclusive flags in the consumed schema subset. This is not full document validation. |
| Inputs | JSON text, YAML text, an object, or a URL fetched with `loadSpec`/`specUrl`. Required top-level metadata and `paths` are checked. The supplied object is copied. |
| Input limits | 2 MiB per document, object depth 32; YAML alias expansion is bounded. Invalid or cyclic JavaScript input is rejected. |
| Internal `$ref` | Internal JSON pointers, including escaped pointer segments, are resolved with a depth and node budget. |
| Missing, cyclic or external `$ref` | Warnings retain unresolved information. External references are never fetched. Unresolved references in request parameters or bodies prevent execution; response schemas remain inspectable. |
| Reference expansion | Maximum depth 32 and expansion budget 100,000 nodes. Reaching a limit leaves unresolved information and a warning. |
| Navigation | Operations from the standard HTTP method fields, tag groups, case-insensitive word search and hash links by operation ID. |
| Interface language | `ApiReference.locale`: `fr` or `en`, default `fr`. Labels, accessibility names and known library diagnostics are localized; OpenAPI content and unknown diagnostics stay as supplied. |
| Session history | At most 20 settled requests in component memory. Records operation ID/method/template path, server origin, status or classified outcome, duration and timestamp; excludes submitted values, headers, bodies and raw errors. Opening an entry only navigates to documentation. |
| Favorites | At most 100 valid unique operation IDs in component memory. No request values, persistence or replay. |
| Session reset | History and favorites can be cleared and reset on specification change, successful import, reload or component remount. No cookies or browser storage. |
| Servers | Operation server overrides path server, then document server. Declared server-variable defaults are substituted; remaining variables prevent execution. |
| Server profiles | Optional integrator-provided profiles, validated as a whole, selected across operations. Relative URLs require the loaded document source; origin changes clear credentials. No persistence or automatic request. |
| Relative servers | For a URL-loaded document, resolve against its source URL. An object/text/file input needs an explicit base in the low-level request API; the component currently requires absolute API server URLs for those inputs. |
| Markdown | Descriptions render as Markdown without executing raw HTML. |
| Examples | Explicit examples first, then schema examples/defaults/enums or bounded generated examples. Generated values may not satisfy advanced constraints. |
| Multiple media types | The first JSON or `+json` media type is preferred; the first remaining type can be shown. There is no media-type selection UI. |
| Callbacks, links, webhooks, SDK generation | No dedicated interface or execution support. |
| Server rendering | Browser interaction is the current target. Server-side rendering and hydration are not a verified compatibility guarantee. |

## Requests and validation

| Feature | Current behavior |
| --- | --- |
| HTTP methods | GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS can be constructed. TRACE is visible but cannot execute through the browser client. GET/HEAD bodies are refused. |
| Path parameters | Scalar values with `simple` style; values are URL-encoded. Missing required values and dot segments are rejected. |
| Query parameters | Scalar or scalar-array values with `form` style. Arrays support `explode: true` (repeated keys) and `false` (comma-separated values). |
| Query array input | JSON arrays or comma-separated values. Use a JSON array when an individual value contains a comma. |
| Header parameters | Scalar values with `simple` style. Invalid names, line breaks, browser-controlled headers and case-insensitive collisions are rejected. |
| Cookies | Parameter serialization and cookie authentication are unsupported. The default transport uses `credentials: 'omit'`. |
| Other serialization | Objects, `deepObject`, non-form query styles, path/header arrays and parameter `content` are unsupported; affected operations cannot execute. |
| Request bodies | JSON (`application/json` or `+json`) only. Form data, multipart uploads, XML and binary bodies are display-only and cannot execute. |
| Basic validation | Primitive/nullable types, nested object properties, `required`, arrays, `enum`, numeric `minimum`/`maximum`, `minItems` and `maxItems`. |
| Boolean schemas | JSON Schema `true`/`false` schemas are unsupported for request construction, including nested schemas and references. Affected requests cannot execute. |
| JSON editor | First syntax/supported-constraint diagnostic, manual whitespace formatting that preserves literals, and manual authored/generated examples. Shares the partial request validator. |
| Advanced schemas | Schema data is retained for inspection. Combinators (`oneOf`, `anyOf`, `allOf`, `not`), discriminators and other advanced JSON Schema semantics are not implemented as a full validator. |
| Additional constraints | `format`, `pattern`, string lengths, `additionalProperties`, exclusive bounds and other undeclared constraints are not enforced by the client. The component warns about partial validation; JSON execution can still proceed and the destination API remains responsible for validation. |
| Response validation | Status, exposed headers, duration and response text are displayed. Response bodies are not checked against their documented schemas. |

The Atelier demo server has its own validation: email shape, supported product IDs, quantity from 1 to 99, one to twenty order lines, EUR currency, documented fields only and a 16 KiB request-body limit. These are demo-server rules, rather than a promise that the library validates those schema keywords for every API.

## Specification comparison

| Feature | Current behavior |
| --- | --- |
| Public APIs | `SpecComparison` and `compareSpecs`, with exported component/report/change/code/severity types. |
| Component options | `locale?: 'fr' \| 'en'`, default `fr`; `colorMode?: 'light' \| 'dark'`, default `light`. No `system` mode or programmatic document prop. |
| Component inputs | Two local OpenAPI 3.0/3.1 JSON/YAML files, including mixed-version pairs. Each retains the parser's 2 MiB/depth-32 bounds. Explicit comparison action, memory only, no upload or API execution. |
| Core signature | `compareSpecs(before: NormalizedSpec, after: NormalizedSpec): SpecDiffReport`. Obtain inputs with `parseSpec` or an explicit `loadSpec` call. Comparison itself performs no fetch and does not mutate its inputs. |
| Operation matching | HTTP method and path, independent of operation ID. Additions and removals are reported. |
| Schema matching | Compares normalized schemas when available; raw boolean source is the fallback. Equivalent 3.0 nullable/exclusive constraints and their 3.1 representation do not create dialect-only changes. |
| Compared subset | Parameters and serialization/requirement flags, request-body requirements, response statuses, normalized primary request/response media types, schema types/properties/required fields/enums/bounds, authentication alternatives and schemes. |
| Primary media only | Normalization selects the first JSON or `+json` media type, otherwise the first available type. Changes confined to secondary media types may not appear. |
| Exclusions | Servers and documentation metadata, including descriptions, examples and defaults. No full OpenAPI or JSON Schema equivalence assessment. |
| Advanced schemas | Additional keywords are compared conservatively; full combinator/conditional semantics are not evaluated. Boolean schemas and unresolved/external/cyclic references require manual review and produce warnings. |
| Report limits | 500 returned changes, depth 16, 20,000 traversal/work visits. A traversal cycle or reached bound sets `truncated` and adds a warning. Counts describe returned changes only. |
| Result categories | `added`, `removed`, `potentially-breaking`, `changed`. Classification is heuristic; an empty report does not certify compatibility. |
| Report contents | Method/path, pointer-like location, code, fixed explanation, severity and optional required-field transition flags. No copied examples, enum values or credentials. Document paths and field names remain visible. |

The public [comparison screen](https://specanto-demo-production.up.railway.app/compare) exposes this subset. See [integration examples](./customization.md#specification-comparison) for the component and helper.

## Authentication and transport

| Feature | Current behavior |
| --- | --- |
| Authentication | HTTP Bearer and API keys in headers. OAuth 2, OpenID Connect, Basic auth and API keys in query/cookies are unsupported for execution. |
| Security inheritance | Document security is inherited unless the operation overrides it. An empty requirement `{}` permits unauthenticated execution. |
| Alternatives and combinations | The user selects an OR alternative; every scheme inside that alternative is required (AND). Unsupported schemes block that selected alternative. Malformed security declarations block execution. |
| Credential scope | Credentials are held in component memory and bound to an origin. The request builder refuses mismatches with the final destination. |
| Session data | Request history and favorites add no credential storage. History stores metadata only; favorites store operation IDs only. |
| URLs | HTTP(S) only. Usernames/passwords in URLs are rejected. A relative URL requires a base. |
| Browser fetch | Direct requests to the chosen API, no Specanto proxy. The API must permit browser access via CORS. Cookies are omitted. |
| Redirects | Redirects are rejected for requests containing known secret headers; unauthenticated requests follow redirects. |
| Request timeout | Component default 45,000 ms; configurable with `requestTimeoutMs`, integer from 100 to 300,000 ms. Invalid configuration blocks execution. |
| Cancellation | The default transport accepts an `AbortSignal`; the component provides manual cancellation and timeout handling. |
| Retries | No automatic retry. HTTP 4xx and 5xx responses remain normal results for inspection. |
| Response limit | The default transport reads at most 100 KiB and marks overflow as truncated. Large, streaming, event-stream and binary responses have no dedicated viewer. |
| cURL | POSIX-shell quoting with known secret headers redacted by default. The low-level `toCurl(request, true)` opt-in includes those headers. Bodies and ordinary parameters are not redacted. |
| Fetch/Python snippets | Generated from the current prepared request with known secret headers redacted by default. Python uses Requests and a 45-second connect/read timeout; this is not the component total timeout. Snippets are never executed by Specanto. |
| Custom transport | A `Transport` prop can replace HTTP behavior; the integrator owns its security, cancellation and response-size policies. |
| Transport label | `transportMode: 'simulation'` explicitly labels a simulation. An injected transport without an explicit mode is labeled as a custom transport; use `http` only for actual HTTP execution. |

## Packaging

The package exports an ES module, declarations and `@specanto/react/styles.css`. React and React DOM are peer dependencies (`>=18.2.0 <20`). The root [MIT LICENSE](../LICENSE), SPDX metadata and public npm publish configuration are included. Version 0.2.1 is published publicly on npm. Local installation can also use a tarball built with Bun. Version 0.2.0 adds the optional `specanto init` CLI; it creates local documentation without detecting backend routes or installing dependencies. The library runs in the consuming application without a separate Specanto deployment. The showcase and Atelier demo require their Bun server.
