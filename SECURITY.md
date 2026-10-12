# Security

Report a vulnerability privately through [GitHub private vulnerability reporting](https://github.com/SergenYUKSEL/Specanto/security/advisories/new). Private reporting is enabled for this repository. Do not post credentials, customer data or private API documents in public issues. This early project does not promise a fixed response timetable.

Specanto is an early browser-based API reference. It parses API descriptions and sends requests to the destination selected by the user. It does not provide an API proxy, hosted credential vault or full JSON Schema validation.

## Current boundaries

- Imported local documents are parsed in the browser. Loading a document by URL fetches it without browser cookies or request-panel credentials; remote `$ref` values are not fetched.
- Descriptions are rendered without executing raw HTML.
- Requests are sent only through the manual request action. Authentication credentials stay in component memory and are bound to the selected destination's origin.
- The default HTTP transport omits browser cookies and rejects redirects when a request contains known secret headers. CORS and HTTPS behavior are controlled by the browser and destination API.
- cURL export redacts known secret headers by default. Request bodies and ordinary parameters are still included; redaction is not a general personal-data filter.
- Documents are limited to 2 MiB with bounded traversal. Displayed response bodies are limited to 100 KiB and may be truncated.

A custom `transport` replaces the default HTTP behavior. Its integrator is responsible for maintaining these boundaries, cancellation and response handling.

## Demo API

Atelier is fictional. Its order endpoint validates and returns a fictitious order, without saving it or processing payments. The server does not log request bodies or retain authentication tokens. Use fictitious details and tokens when exploring the public demo. Order bodies have a 16 KiB limit.

Include a minimal reproduction with fictional inputs and the affected version in your private report. See [compatibility](./docs/compatibility.md) for the limits of the client validator and supported authentication methods.
