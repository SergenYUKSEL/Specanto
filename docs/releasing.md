# Manual release procedure

The checks workflow validates changes. It does not publish a package or deploy infrastructure. npm publication requires an explicit author decision and a usable npm account/scope.

The author approved MIT, OpenAPI 3.0 support and publication preparation on 13 October 2026. The candidate uses `license: "MIT"`, includes the root LICENSE and has public publish configuration. Publication is currently blocked by the absence of a publisher npm account and unverified access to `@specanto`; a registry 404 does not resolve either issue.

## Prepare a candidate

1. Choose and adopt the project license. Confirm the npm package name and the publisher's rights to its scope. A registry 404 only shows that no package was found; it does not establish scope ownership.
2. Set the intended version in `package.json`, update `CHANGELOG.md` and the compatibility matrix, and refresh dependency/font notices if dependencies changed.
3. Run `bun install --frozen-lockfile`, `bun run check`, `bun run check:consumer` and `bun run test:e2e`.
4. Run `bun pm pack --destination output`. Inspect the archive for JS, declarations, styles, README, adopted license and third-party notices; exclude fixtures, credentials and development-only hosts. Install this exact archive in a clean consumer.
5. Commit and push the reviewed candidate, then inspect CI for that exact commit. If CI cannot start because of provider account/billing restrictions, record the annotation and the complete local verification; do not claim CI passed. Tagging and creating a public release are separate from a routine source push.

The permanent [React example](https://github.com/SergenYUKSEL/Specanto/tree/main/examples/consumer-vite) exercises integration from an archive. The consumer check validates React 18.2 and 19.3 plus exported types.

## Publish only after authorization

Create/sign in to the publisher's [npm account](https://www.npmjs.com/signup), then authenticate the CLI with `npm login --registry https://registry.npmjs.org/`. Complete login and any 2FA in npm's own flow; never commit credentials. Confirm `npm whoami` and access to the selected scope. Publishing `@specanto/react` requires the `specanto` user/organization scope or appropriate permission in that organization. If a different scope is chosen, update the package name and all integration examples before packing again.

For the approved candidate, `private` is removed and `publishConfig` explicitly selects public access on the npm registry. Keep the React peer dependencies and CSS export intact. Verify the exact archive:

```sh
bun run check
CI=true bun run test:e2e
bun pm pack --filename output/specanto-react-0.1.0.tgz
SPECANTO_CONSUMER_TARBALL="output/specanto-react-0.1.0.tgz" bun run check:consumer
npm publish ./output/specanto-react-0.1.0.tgz --dry-run --access public --registry https://registry.npmjs.org/
```

Once account/scope access and the candidate are verified, publish that archive with the same command without `--dry-run`. Verify the registry's version, integrity and license metadata, then install from the registry in a clean consumer before announcing availability. A successful dry run is not publication or proof of scope ownership.

Publishing a version is an external release and cannot be treated as a disposable verification step. There is deliberately no unattended npm publish command or token in the CI workflow. Follow the current [npm publication documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/) for registry authentication and access requirements.

## Update the demo

Build/test the same checkout and deploy using the explicit Railway project/environment/service IDs in the README. Wait for that deployment ID to reach `SUCCESS`, then check `/health`, the reference screen, a real GET and a fictitious POST. A Git push and a Railway CLI upload are separate actions.

The browser workflow uses the production demo build in CI and a separate test fixture host. Fixture pages are excluded from the public demo build and Docker runtime.
