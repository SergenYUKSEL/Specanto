# Customizing the reference

The component keeps its styles inside `.sp-reference`. It does not load fonts or change the host application's body styles.

```tsx
import { ApiReference } from '@specanto/react';
import '@specanto/react/styles.css';

export function Reference() {
  return (
    <ApiReference
      specUrl="/openapi.json"
      title="Atelier API"
      logo={<span aria-label="Atelier">atelier</span>}
      locale="en"
      colorMode="system"
      accentColor="#FF5A36"
      fontFamily="Archivo, system-ui, sans-serif"
      monoFontFamily="'IBM Plex Mono', monospace"
      requestTimeoutMs={30_000}
    />
  );
}
```

Your application supplies and loads the chosen fonts. The demo self-hosts Archivo and IBM Plex Mono; these font assets are not part of the React library archive.

## Interface language

`ApiReference` accepts `locale="fr"` or `locale="en"`, with French as the default. The exported `ReferenceLocale` type describes these values. Locale changes interface labels, accessibility names and known library diagnostics. OpenAPI titles, descriptions, parameter/property names and examples remain exactly as authored; unknown diagnostics and user-supplied values remain unchanged. The core helpers exported by the package do not accept a locale option.

Changing locale does not import the document again, reset the session, or send/cancel a business request. The demo's language selector exposes the same prop. Supply multilingual OpenAPI content yourself when the document needs translation.

## Logo and fonts

`logo` accepts a React node and replaces the navigation brand on desktop and mobile. An image or SVG should have an accessible name, for example `<img src="/brand.svg" alt="Atelier" />`. Keep the node compact. The default is the Specanto wordmark. The documentation footer retains its Specanto attribution.

`fontFamily` configures reading/interface text; `monoFontFamily` configures code, routes and request fields. Both accept CSS font-family values. A wrapper can instead set the existing scoped variables:

```css
.my-api-docs .sp-reference {
  --sp-font: "Archivo", system-ui, sans-serif;
  --sp-mono: "IBM Plex Mono", monospace;
  --sp-accent: #ff5a36;
}
```

The corresponding component props set inline custom properties and take precedence over wrapper declarations. Keep selectors scoped to your wrapper and `.sp-reference` so other application screens retain their own styles.

## Request timeout

`requestTimeoutMs` defaults to `45_000`. Supply a finite integer from `100` to `300_000` milliseconds inclusive. Invalid values show a configuration error and disable request execution; they are not silently clamped. The timeout message displays the configured duration.

This timeout covers a manually submitted request, including an injected transport. Spec loading has its own bounded loader behavior. Cancellation aborts the supplied signal and returns control to the interface; a custom transport must honor that signal to stop its underlying work. Cancellation cannot undo effects already applied by the destination server.

## Server profiles

Supply named destinations independently of the OpenAPI document:

```tsx
import type { ServerProfile } from '@specanto/react';

const serverProfiles: ServerProfile[] = [
  { id: 'dev', label: 'Development', url: 'https://dev.example.com/v1' },
  { id: 'staging', label: 'Staging', url: 'https://staging.example.com/v1' },
  { id: 'production', label: 'Production', url: 'https://api.example.com/v1' },
];

<ApiReference specUrl="/openapi.json" serverProfiles={serverProfiles} />;
```

Each profile requires a unique `id`, a `label` and an HTTP(S) `url`; `description` is optional. The first profile is selected initially. The selected profile persists between operations. Choose “Spécification OpenAPI” to use the operation's declared servers, or “Autre serveur” for a temporary custom URL. Importing a file through the component selects that document's declared servers.

Relative profile URLs resolve against a URL-loaded document's source. Object/text/file sources require absolute profile URLs. Profile configuration is limited to 20 entries, with at most 80 characters for IDs, 120 for labels, 2,048 for URLs and 1,000 for descriptions. Invalid configuration blocks requests and shows an error.

Profiles contain no credential fields and are not saved to browser storage. Switching origins clears credentials; returning to an earlier origin does not restore them. Changing the destination aborts the current request and clears its displayed result. No request is sent automatically.

## Code examples and JSON editor

The console offers cURL, Fetch and Python examples built from the current valid form. Known secret headers are redacted; bodies and ordinary parameters remain included. The copy action copies the selected language. The low-level `toFetch` and `toPython` exports accept a `PreparedRequest`; as with `toCurl`, an explicit second argument of `true` includes secret headers. The console provides no such opt-in.

Python examples require the external `requests` package. Their 45-second timeout covers connection/read inactivity, rather than the component's total request deadline. Fetch examples do not include an automatic timeout; an application can supply its own AbortSignal. These snippets are generated text, never executed by Specanto.

The JSON editor diagnoses syntax and the engine's supported schema constraints, displaying the first error's field path when available. “Formater JSON” adds whitespace while retaining number literals, escapes and duplicate keys; invalid input stays unchanged. “Générer un exemple” inserts an authored example when available, otherwise a bounded schema example. These actions require a click. Advanced constraints still require server-side validation.

## Session history and favorites

The navigation includes a collapsible Session panel. Favorite buttons save operation IDs only, with a maximum of 100 valid unique IDs. Favorites belong to the current specification and component instance; they do not restore a previous form or its credentials.

Up to 20 settled requests are listed, newest first. Each history entry contains an internal ID, operation ID, HTTP method, template path, HTTP(S) server origin, optional response status, classified outcome, rounded duration and timestamp. Outcomes cover responses, cancellation, timeout, network failure and custom-transport failure. A full request URL, substituted path values, query/fragment values, credentials, headers, request/response bodies and raw error messages are never retained by the history.

Both lists stay in React memory. They use no cookies, `localStorage`, `sessionStorage` or remote persistence, and reset on specification change, successful local import, reload or component remount. Each list has an explicit clear action. Clearing history does not cancel an active request; that request can add a new entry when it settles. Selecting a favorite or history entry opens its documentation only: the user must explicitly send any new request. There is no request replay.

## Specification comparison

The public React component provides a standalone local-file review screen:

```tsx
import { SpecComparison } from '@specanto/react';
import '@specanto/react/styles.css';

export function ComparisonScreen() {
  return <SpecComparison locale="en" colorMode="dark" />;
}
```

`SpecComparisonProps` contains `locale?: 'fr' | 'en'` (default `fr`) and `colorMode?: 'light' | 'dark'` (default `light`). Unlike `ApiReference`, it has no `system` color mode or `spec`/`specUrl` prop. Its styles are scoped to `.sp-comparison` and included in the shared CSS export. The public demo is available at [OpenAPI comparison](https://specanto-demo-production.up.railway.app/compare).

Choose a before and after OpenAPI 3.0 or 3.1 JSON/YAML file, then click Compare. Mixed-version pairs use normalized schemas, so equivalent nullable representations do not appear as changes. Each file has the parser's 2 MiB and depth-32 bounds. Selecting a replacement file clears the previous result. Files are parsed in the browser, retained in component memory and removable with Clear files; no document upload or API request occurs.

For application-owned sources, normalize the two documents before using the pure comparison helper:

```ts
import { compareSpecs, parseSpec, type SpecDiffReport } from '@specanto/react';

export function reviewVersions(beforeDocument: object | string, afterDocument: object | string): SpecDiffReport {
  return compareSpecs(parseSpec(beforeDocument), parseSpec(afterDocument));
}
```

The exact helper signature is `compareSpecs(before: NormalizedSpec, after: NormalizedSpec): SpecDiffReport`. `parseSpec` accepts an object or JSON/YAML text; explicitly calling `loadSpec` is another way to obtain a normalized document from a URL. `compareSpecs` itself makes no network calls and does not mutate either source.

Operations are matched by method and path, independently of `operationId`. The compared subset includes parameters and their serialization/requirement flags, request-body requirements, response statuses, each normalized primary request/response media type, schema types/properties/required fields/enums/bounds, and authentication alternatives/schemes. Secondary media types, servers and documentation metadata such as descriptions, examples and defaults are excluded. Advanced JSON Schema keywords are compared conservatively, without evaluating their full semantics; unresolved/external/cyclic references and boolean schemas produce review warnings.

The returned report includes `changes`, `warnings`, `summary` and `truncated`. Each change has a method, path, pointer-like location, category code, fixed explanation and severity (`added`, `removed`, `potentially-breaking` or `changed`); required-field transitions can additionally include `beforeRequired`/`afterRequired`. Reports do not copy example values, enum values or credentials. Schema/operation paths and field names still come from the supplied documents.

The report holds at most 500 changes and traversal is bounded by depth 16 and 20,000 work visits. Reaching a limit or traversal cycle sets `truncated` and adds a warning; summary counts refer only to returned changes. Classification is heuristic: even an empty, untruncated report cannot certify complete API compatibility. Review the original documents and the warnings before integrating a changed API.

## Resizable panels

From version 0.3.0, desktop references offer draggable vertical separators. Navigation is limited to 220–420 px; the request console to 320–680 px, with further limits based on the available width to preserve 320 px for the documentation. The console stacks below the documentation in narrow reference containers; the mobile layout has no separators. Double-click or Enter resets a separator. Arrow keys adjust it (Shift uses a larger step), Home/End select its limits and Escape cancels an active drag.

Choices belong to each mounted reference, survive operation/theme changes and clear when it is remounted or reloaded. No browser storage or new integrator props are required. Resizing does not execute or cancel requests and does not reset the form.
