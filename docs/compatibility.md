# Compatibility — Specanto 0.1.0

This is a bounded first implementation of an OpenAPI reference and browser HTTP client. Parsing a document does not certify that it conforms to OpenAPI, and the request validator is not a complete JSON Schema validator.

## Documents and display

| Feature | Current behavior |
| --- | --- |
| OpenAPI versions | `3.1.x`, where the patch is numeric. Other versions, including Swagger 2 and OpenAPI 3.0, are rejected. |
| Inputs | JSON text, YAML text, an object, or a URL fetched with `loadSpec`/`specUrl`. Required top-level metadata and `paths` are checked. The supplied object is copied. |
| Input limits | 2 MiB per document, object depth 32; YAML alias expansion is bounded. Invalid or cyclic JavaScript input is rejected. |
| Internal `$ref` | Internal JSON pointers, including escaped pointer segments, are resolved with a depth and node budget. |
| Missing, cyclic or external `$ref` | Warnings retain unresolved information. External references are never fetched. Unresolved references in request parameters or bodies prevent execution; response schemas remain inspectable. |
| Reference expansion | Maximum depth 32 and expansion budget 100,000 nodes. Reaching a limit leaves unresolved information and a warning. |
| Navigation | Operations from the standard HTTP method fields, tag groups, case-insensitive word search and hash links by operation ID. |
| Servers | Operation server overrides path server, then document server. Declared server-variable defaults are substituted; remaining variables prevent execution. |
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
| Advanced schemas | Schema data is retained for inspection. Combinators (`oneOf`, `anyOf`, `allOf`, `not`), discriminators and other advanced JSON Schema semantics are not implemented as a full validator. |
| Additional constraints | `format`, `pattern`, string lengths, `additionalProperties`, exclusive bounds and other undeclared constraints are not enforced by the client. The component warns about partial validation; JSON execution can still proceed and the destination API remains responsible for validation. |
| Response validation | Status, exposed headers, duration and response text are displayed. Response bodies are not checked against their documented schemas. |

The Atelier demo server has its own validation: email shape, supported product IDs, quantity from 1 to 99, one to twenty order lines, EUR currency, documented fields only and a 16 KiB request-body limit. These are demo-server rules, rather than a promise that the library validates those schema keywords for every API.

## Authentication and transport

| Feature | Current behavior |
| --- | --- |
| Authentication | HTTP Bearer and API keys in headers. OAuth 2, OpenID Connect, Basic auth and API keys in query/cookies are unsupported for execution. |
| Security inheritance | Document security is inherited unless the operation overrides it. An empty requirement `{}` permits unauthenticated execution. |
| Alternatives and combinations | The user selects an OR alternative; every scheme inside that alternative is required (AND). Unsupported schemes block that selected alternative. Malformed security declarations block execution. |
| Credential scope | Credentials are held in component memory and bound to an origin. The request builder refuses mismatches with the final destination. |
| URLs | HTTP(S) only. Usernames/passwords in URLs are rejected. A relative URL requires a base. |
| Browser fetch | Direct requests to the chosen API, no Specanto proxy. The API must permit browser access via CORS. Cookies are omitted. |
| Redirects | Redirects are rejected for requests containing known secret headers; unauthenticated requests follow redirects. |
| Request timeout | Component default 45,000 ms; configurable with `requestTimeoutMs`, integer from 100 to 300,000 ms. Invalid configuration blocks execution. |
| Cancellation | The default transport accepts an `AbortSignal`; the component provides manual cancellation and timeout handling. |
| Retries | No automatic retry. HTTP 4xx and 5xx responses remain normal results for inspection. |
| Response limit | The default transport reads at most 100 KiB and marks overflow as truncated. Large, streaming, event-stream and binary responses have no dedicated viewer. |
| cURL | POSIX-shell quoting with known secret headers redacted by default. The low-level `toCurl(request, true)` opt-in includes those headers. Bodies and ordinary parameters are not redacted. |
| Custom transport | A `Transport` prop can replace HTTP behavior; the integrator owns its security, cancellation and response-size policies. |
| Transport label | `transportMode: 'simulation'` explicitly labels a simulation. An injected transport without an explicit mode is labeled as a custom transport; use `http` only for actual HTTP execution. |

## Packaging

The package exports an ES module, declarations and `@specanto/react/styles.css`. React and React DOM are peer dependencies (`>=18.2.0 <20`). The package is private and not published to npm; local installation uses a tarball built with Bun. The library runs in the consuming application without a separate Specanto deployment. The showcase and Atelier demo require their Bun server.
