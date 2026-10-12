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
