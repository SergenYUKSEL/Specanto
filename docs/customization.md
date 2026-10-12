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
