# Manual release procedure

The checks workflow validates changes. It does not publish a package or deploy infrastructure. npm publication requires an explicit author decision and a usable npm account/scope.

The author approved MIT, OpenAPI 3.0 support and npm publication on 13 October 2026. Version `@specanto/react@0.2.1` is published publicly under MIT, including the local documentation starter. The publisher authenticated as `sergenyuksel`, verified ownership of the `specanto` organization and completed npm’s interactive 2FA flow. Future versions still require candidate review and authenticated publication.

## Prepare a candidate

1. Choose and adopt the project license. Confirm the npm package name and the publisher's rights to its scope. A registry 404 only shows that no package was found; it does not establish scope ownership.
2. Set the intended version in `package.json`, update `CHANGELOG.md` and the compatibility matrix, and refresh dependency/font notices if dependencies changed.
3. Run `bun install --frozen-lockfile`, `bun run check`, `bun run check:consumer`, `bun run check:starter` and `bun run test:e2e`.
4. Run `bun pm pack --destination output`. Inspect the archive for JS, declarations, styles, README, adopted license and third-party notices; exclude fixtures, credentials and development-only hosts. Install this exact archive in a clean consumer.
5. Commit and push the reviewed candidate, then inspect CI for that exact commit. If CI cannot start because of provider account/billing restrictions, record the annotation and the complete local verification; do not claim CI passed. Tagging and creating a public release are separate from a routine source push.

The permanent [React example](https://github.com/SergenYUKSEL/Specanto/tree/main/examples/consumer-vite) exercises integration from an archive. The consumer check validates React 18.2 and 19.3 plus exported types.

## Publish only after authorization

Create/sign in to the publisher's [npm account](https://www.npmjs.com/signup), then authenticate the CLI with `npm login --registry https://registry.npmjs.org/`. Complete login and any 2FA in npm's own flow; never commit credentials. Confirm `npm whoami` and access to the selected scope. Publishing `@specanto/react` requires the `specanto` user/organization scope or appropriate permission in that organization. If a different scope is chosen, update the package name and all integration examples before packing again.

For the approved candidate, `private` is removed and `publishConfig` explicitly selects public access on the npm registry. Keep the React peer dependencies and CSS export intact. Verify the exact archive:

```sh
bun run check
CI=true bun run test:e2e
bun pm pack --filename output/specanto-react-0.3.0.tgz
SPECANTO_CONSUMER_TARBALL="output/specanto-react-0.3.0.tgz" bun run check:consumer
SPECANTO_STARTER_TARBALL="output/specanto-react-0.3.0.tgz" bun run check:starter
npm publish ./output/specanto-react-0.3.0.tgz --dry-run --access public --registry https://registry.npmjs.org/
```

Once account/scope access and the candidate are verified, publish that archive with the same command without `--dry-run`. npm may accept the upload before it becomes downloadable; wait for registry availability without resubmitting the same version. Verify the registry's version, integrity and license metadata, then install from the registry in a clean consumer before announcing availability. A successful dry run is not publication or proof of scope ownership.

Publishing a version is an external release and cannot be treated as a disposable verification step. There is deliberately no unattended npm publish command or token in the CI workflow. Follow the current [npm publication documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/) for registry authentication and access requirements.

## Published 0.1.0 archive

The first publication used the previously reviewed 42-file archive from source commit `ba79bdc`, SHA-256 `057d8e5601bc90d31f6ce4f821d7d7e5c1bddcccebf4a990553970cd519a2f2b`. Preserve this artifact: documentation updates after publication do not replace the immutable registry version. The archive’s documents describe the pre-publication candidate; the repository records the completed release. Release `0.1.0` has no Git tag or GitHub release.

## Published 0.2.0 archive

The starter release uses the reviewed 45-file archive from source commit `de60ac0`, SHA-256 `f40d0dcd84f748d6e17ea7fb5b650fd68e4cc7578d681c6b677437c5fa9d3e54`. Registry version, MIT license, `latest` tag, executable metadata and downloaded bytes were verified. The CLI and generated app were tested again from the registry, including Node/Bun entry points, documented bunx/npx commands, real Express proxy requests on Chromium/WebKit and React 18.2/19.3 consumers. The archive remains unchanged; repository documentation reflects completed publication. No Git tag or GitHub release was created.

## Published 0.2.1 archive

The documentation correction uses the reviewed archive from source commit `92f56ae`, SHA-256 `60c73223c9af8e1b7829556c53e49882d28e97320c63eeab39efd52e738190c6`. Public examples now use the generic `api-docs` directory; the package remains `@specanto/react`. Registry version, MIT license, latest tag and downloaded bytes were verified. The registry CLI creates a private app named `api-docs`, and the npm website visibly displays version 0.2.1 with the corrected README. Library JS/CSS and CLI implementation are unchanged. The published archive is preserved.

## Update the demo

Build/test the same checkout and deploy using the explicit Railway project/environment/service IDs in the README. Wait for that deployment ID to reach `SUCCESS`, then check `/health`, the reference screen, a real GET and a fictitious POST. A Git push and a Railway CLI upload are separate actions.

The browser workflow uses the production demo build in CI and a separate test fixture host. Fixture pages are excluded from the public demo build and Docker runtime.
