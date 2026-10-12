import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const repository = resolve(import.meta.dir, '..');
const example = join(repository, 'examples', 'consumer-vite');
const temporary = await mkdtemp(join(tmpdir(), 'specanto-consumer-'));
const matrix = [
  { react: '18.2.0', reactTypes: '18.3.31', reactDomTypes: '18.3.7' },
  { react: '19.3.0', reactTypes: '19.3.0', reactDomTypes: '19.3.0' },
];
const selectedVersion = process.env.SPECANTO_CONSUMER_REACT;
const selected = selectedVersion ? matrix.filter((item) => item.react === selectedVersion) : matrix;

async function command(args: string[], cwd: string) {
  const task = Bun.spawn(args, { cwd, stdout: 'inherit', stderr: 'inherit' });
  if (await task.exited !== 0) throw new Error(`Consumer command failed: ${args.join(' ')}`);
}

try {
  if (!selected.length) throw new Error(`Unsupported SPECANTO_CONSUMER_REACT value: ${selectedVersion}. Choose ${matrix.map((item) => item.react).join(' or ')}.`);
  // Build first: the archive must contain current declarations and browser code.
  await command(['bun', 'run', 'build:lib'], repository);
  const pack = Bun.spawnSync(['bun', 'pm', 'pack', '--destination', temporary], { cwd: repository, stdout: 'pipe', stderr: 'pipe' });
  if (pack.exitCode !== 0) throw new Error(pack.stderr.toString());
  const tarball = (await Array.fromAsync(new Bun.Glob('*.tgz').scan(temporary)))[0];
  if (!tarball) throw new Error('Package archive was not created');
  const manifest = JSON.parse(await readFile(join(example, 'package.json'), 'utf8'));

  for (const entry of selected) {
    const consumer = join(temporary, `react-${entry.react}`);
    await cp(example, consumer, { recursive: true, filter: (path) => !path.split('/').some((part) => ['node_modules', 'dist', 'bun.lock'].includes(part)) });
    await writeFile(join(consumer, 'package.json'), JSON.stringify({
      ...manifest,
      dependencies: { ...manifest.dependencies, '@specanto/react': `file:${join(temporary, tarball)}`, react: entry.react, 'react-dom': entry.react },
      devDependencies: { ...manifest.devDependencies, '@types/react': entry.reactTypes, '@types/react-dom': entry.reactDomTypes },
    }, null, 2));
    await writeFile(join(consumer, 'src', 'public-contracts.tsx'), `
import { ApiReference, buildRequest, normalizeServerProfiles, parseSpec, toCurl, toFetch, toPython } from '@specanto/react';
import type { ApiReferenceProps, NormalizedSpec, Operation, PreparedRequest, RequestInput, RequestResult, Schema, ServerProfile, Transport } from '@specanto/react';
import { spec } from './spec';

const profiles: ServerProfile[] = [{ id: 'dev', label: 'Development', url: 'https://api.example.com' }];
const objectSource: ApiReferenceProps = { spec, serverProfiles: profiles, logo: <span>Consumer</span>, monoFontFamily: 'monospace', requestTimeoutMs: 5000 };
const textSource: ApiReferenceProps = { spec: JSON.stringify(spec) };
const urlSource: ApiReferenceProps = { specUrl: '/openapi.json' };
// @ts-expect-error The component requires exactly one specification source.
const noSource: ApiReferenceProps = { title: 'Missing input' };
// @ts-expect-error Object/text and URL sources cannot be passed together.
const bothSources: ApiReferenceProps = { spec, specUrl: '/openapi.json' };
// @ts-expect-error Custom request timeouts accept numbers only.
const wrongTimeout: ApiReferenceProps = { spec, requestTimeoutMs: '5000' };
// @ts-expect-error Server profiles require a stable identifier and URL.
const wrongProfile: ServerProfile = { label: 'Missing fields' };
// @ts-expect-error Transport results must include status, headers and body.
const wrongTransport: Transport = async () => ({ status: 200 });

const transport: Transport = async (request: PreparedRequest, signal?: AbortSignal): Promise<RequestResult> => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  return { status: 200, statusText: 'OK', duration: 0, headers: {}, body: request.url };
};
const normalized: NormalizedSpec = parseSpec(spec);
const operation: Operation = normalized.operations[0];
const input: RequestInput = { serverUrl: 'https://api.example.com', parameterValues: {}, credentials: {}, credentialOrigins: {} };
const request: PreparedRequest = buildRequest(operation, input);
const schema: Schema = { type: 'string' };
void [objectSource, textSource, urlSource, noSource, bothSources, wrongTimeout, wrongTransport, wrongProfile, normalizeServerProfiles(profiles), toCurl(request), toFetch(request), toPython(request), schema];
export const reference = <ApiReference spec={spec} transport={transport} transportMode="simulation" />;
`);
    await writeFile(join(consumer, 'runtime-check.ts'), `
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ApiReference, parseSpec } from '@specanto/react';
import { spec } from './src/spec';
const normalized = parseSpec(spec);
if (normalized.operations[0]?.id !== 'listProducts') throw new Error('Exported parser did not load the consumer specification');
const html = renderToString(createElement(ApiReference, { spec, logo: 'Consumer reference', requestTimeoutMs: 5000 }));
if (!html.includes('Consumer reference') || !html.includes('sp-reference')) throw new Error('React peer could not render the packaged component');
`);
    console.log(`\nClean consumer: React ${entry.react}, @types/react ${entry.reactTypes}`);
    await command(['bun', 'install'], consumer);
    await command(['bun', 'run', 'build'], consumer);
    await command(['bun', 'run', 'runtime-check.ts'], consumer);
    const assets = await Array.fromAsync(new Bun.Glob('dist/assets/*.css').scan(consumer));
    const css = (await Promise.all(assets.map((asset) => readFile(join(consumer, asset), 'utf8')))).join('\n');
    if (!css.includes('.sp-reference') || !css.includes('--sp-mono') || !css.includes('.sp-guided-body')) throw new Error('Consumer build is missing the exported Specanto CSS');
    console.log(`React ${entry.react}: public TypeScript contract, runtime peer, Vite build and exported CSS verified.`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
