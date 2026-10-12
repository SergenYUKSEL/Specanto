# Security

Report a vulnerability privately through [GitHub private vulnerability reporting](https://github.com/SergenYUKSEL/Specanto/security/advisories/new). Private reporting is enabled for this repository. Do not post credentials, customer data or private API documents in public issues. This early project does not promise a fixed response timetable.

Specanto is an early browser-based API reference. It parses API descriptions and sends requests to the destination selected by the user. It does not provide an API proxy, hosted credential vault or full JSON Schema validation.

## Current boundaries

- Imported local documents are parsed in the browser. Loading a document by URL fetches it without browser cookies or request-panel credentials; remote `$ref` values are not fetched.
- Descriptions are rendered without executing raw HTML.
- Requests are sent only through the manual request action. Authentication credentials stay in component memory and are bound to the selected destination's origin.
- The default HTTP transport omits browser cookies and rejects redirects when a request contains known secret headers. CORS and HTTPS behavior are controlled by the browser and destination API.
- cURL, Fetch and Python exports redact known secret headers by default. Request bodies and ordinary parameters are still included; redaction is not a general personal-data filter.
- Session history keeps at most 20 entries containing operation ID, method, template path, server origin, status or classified outcome, duration and timestamp. It excludes full request URLs, submitted parameters, credentials, headers, bodies and raw errors. Favorites keep at most 100 operation IDs. Both stay in component memory, are explicitly clearable and reset on specification changes, successful import, reload or remount. No cookies, browser storage or remote persistence are used. Opening an entry navigates to documentation without replaying a request.
- The comparison screen reads two local files without uploading them or executing an API request. The files and report remain in component memory and can be cleared. Reports use fixed change explanations without copying examples, enum values or credentials; document paths and field names still appear. `compareSpecs` performs no fetch and offers a bounded heuristic review, not proof of compatibility. Limits are 500 changes, depth 16 and 20,000 work visits; truncation and unresolved/advanced schemas require review.
- Documents are limited to 2 MiB with bounded traversal. Displayed response bodies are limited to 100 KiB and may be truncated.

A custom `transport` replaces the default HTTP behavior. Its integrator is responsible for maintaining these boundaries, cancellation and response handling.

## Demo API

Atelier is fictional. Its order endpoint validates and returns a fictitious order, without saving it or processing payments. The server does not log request bodies or retain authentication tokens. Use fictitious details and tokens when exploring the public demo. Order bodies have a 16 KiB limit.

Include a minimal reproduction with fictional inputs and the affected version in your private report. See [compatibility](./docs/compatibility.md) for the limits of the client validator and supported authentication methods.
