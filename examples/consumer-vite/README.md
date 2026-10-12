# Packaged React consumer

This standalone Vite application imports `@specanto/react` and its exported CSS from a local package archive. It has no aliases or imports into the library source. The example supplies a custom SVG logo, both font families, an accent color, a five-second request timeout and an explicitly labeled simulation transport.

From the repository root, create the archive:

```sh
bun install
bun run build:lib
mkdir -p output
bun pm pack --filename output/specanto-react-0.1.0.tgz
```

Then run this application:

```sh
cd examples/consumer-vite
bun install
bun run dev
```

Open `http://127.0.0.1:5193`. Requests are sent only after clicking the request button. The simulation returns a fictional product and sends no HTTP request to `api.example.com`. To connect a real API, replace the specification and remove `transport` and `transportMode` from the component.

Build the application with `bun run build`. Its dependencies, generated build and local archive are excluded from Git.

From the repository root, `bun run check:consumer` copies this example to temporary directories, installs an actual archive, and checks React `18.2.0` and `19.3.0` with their respective TypeScript definitions. It validates public source/transport contracts, renders the packaged component with each React peer, builds with Vite and checks that the exported CSS is present. CI runs both entries by default. Use `SPECANTO_CONSUMER_REACT=18.2.0 bun run check:consumer` or `SPECANTO_CONSUMER_REACT=19.3.0 bun run check:consumer` to select a single entry. The temporary consumers are removed after success or failure.

The server render check verifies that importing the package and rendering its initial loading state do not need a DOM. Specification loading happens in a React effect in the browser; this check does not establish server-rendered documentation or hydration support. The library keeps `react-markdown` and `yaml` as runtime dependencies so the consuming environment resolves their Node/browser entry points.
