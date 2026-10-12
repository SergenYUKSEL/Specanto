# Manual release procedure

The checks workflow validates changes. It does not publish a package or deploy infrastructure. npm publication requires an explicit author decision and a usable npm account/scope.

## Prepare a candidate

1. Choose and adopt the project license. Confirm the npm package name and the publisher's rights to its scope. A registry 404 only shows that no package was found; it does not establish scope ownership.
2. Set the intended version in `package.json`, update `CHANGELOG.md` and the compatibility matrix, and refresh dependency/font notices if dependencies changed.
3. Run `bun install --frozen-lockfile`, `bun run check`, `bun run check:consumer` and `bun run test:e2e`.
4. Run `bun pm pack --destination output`. Inspect the archive for JS, declarations, styles, README, adopted license and third-party notices; exclude fixtures, credentials and development-only hosts. Install this exact archive in a clean consumer.
5. Commit and push the reviewed candidate, then wait for CI to pass for that exact commit. Tagging and creating a public release are explicit release actions, separate from a routine source push.

The permanent [React example](https://github.com/SergenYUKSEL/Specanto/tree/main/examples/consumer-vite) exercises integration from an archive. The consumer check validates React 18.2 and 19.3 plus exported types.

## Publish only after authorization

Authenticate with the publisher's npm account and confirm the selected registry and scope. Remove `private` only for an approved publication candidate; keep the React peer dependencies and CSS export intact. For a public scoped package, explicitly choose public access. Inspect a dry-run package before publishing the reviewed archive.

Publishing a version is an external release and cannot be treated as a disposable verification step. There is deliberately no unattended npm publish command or token in the CI workflow. Follow the current [npm publication documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/) for registry authentication and access requirements.

## Update the demo

Build/test the same checkout and deploy using the explicit Railway project/environment/service IDs in the README. Wait for that deployment ID to reach `SUCCESS`, then check `/health`, the reference screen, a real GET and a fictitious POST. A Git push and a Railway CLI upload are separate actions.

The browser workflow uses the production demo build in CI and a separate test fixture host. Fixture pages are excluded from the public demo build and Docker runtime.
