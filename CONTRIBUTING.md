# Contributing to Specanto

Specanto is an early React library and a controlled demonstration. Keep its React-independent engine, reusable component and fictional demo API distinct.

## Set up

Use Bun `1.3.14` and install dependencies from the repository root:

```sh
bun install
bun run dev
```

The showcase runs at `http://localhost:5188`, the reference at `/demo`, and the demo API at port `3001`. Vite forwards the API routes during development.

## Find the relevant code

| Location | Responsibility |
| --- | --- |
| `src/core` | Parse and normalize OpenAPI, construct requests, examples and HTTP transport |
| `src/ui` | React reference screen and manual request controls |
| `src/styles` | Scoped reference styles and `--sp-` tokens |
| `demo` | Showcase, demo shell and local/URL import controls |
| `fixtures/atelier.openapi.json` | Fictional API contract and examples |
| `server` | Static serving and stateless Atelier API |
| `tests` | Unit and boundary tests with Bun |
| `e2e` | Browser journeys with Playwright |

## Make and check a change

For engine or server behavior, add a focused test that observes the public behavior, confirm its failure, then implement the change. Use actual `Request`/`Response` objects for demo API tests. A fixture change should keep the documented examples and the controlled API consistent.

Use fictional customer details and tokens in fixtures, tests and screenshots. Demo orders must stay stateless: no database, payments, request-body logging or credential persistence.

Run the checks appropriate to the change, then the combined checks before delivery:

```sh
bun run check
bun run check:consumer
bun run test:e2e
```

`check` runs lint, strict TypeScript checks, the Bun tests and library/demo builds. The packaged-consumer check exercises the public JavaScript, React peer dependency and CSS exports from a separate application. The library build also emits TypeScript declarations. Playwright runs Chromium and mobile WebKit against the demo and a separate integration fixture; install both with `bunx playwright install chromium webkit`. GitHub Actions uses the production demo build. The permanent example and consumer runner verify React 18.2/19.3 and the exported TypeScript contracts.

Individual commands are available when working on a focused area:

```sh
bun run lint
bun run typecheck
bun run test
bun run build:lib
bun run build:demo
```

Check the demo at mobile, tablet and desktop widths when changing the interface. Verify keyboard focus, long API paths, error states and dark mode. Business requests must remain an explicit user action.

Update the [compatibility matrix](./docs/compatibility.md) when support changes. Do not describe a partial validator as full OpenAPI or JSON Schema validation. Preserve unknown schema information for inspection and make execution limits visible.

## Package and deployment

`@specanto/react@0.2.1` is published publicly on [npm](https://www.npmjs.com/package/@specanto/react) under MIT. Registry integration uses `bun add @specanto/react`. Local integration uses `bun run build:lib` followed by `bun pm pack --filename specanto-react-0.3.0.tgz`; see the [README](./README.md#install-the-local-react-package).

The public showcase and demo deploy through the Railway CLI to the exact project, environment and selected demo service recorded in the [README](./README.md#deployment). Deployment changes should pass the checks and be followed by a deployment-status and HTTP health check.

The project uses the root MIT [LICENSE](./LICENSE). Routine contributions do not authorize registry publication or changes to npm ownership.

Refresh third-party notices after a runtime/font dependency update with `bun run scripts/notices.ts`. Follow the [manual release procedure](./docs/releasing.md) for a publication candidate.
