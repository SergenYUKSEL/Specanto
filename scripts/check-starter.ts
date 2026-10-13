import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { chromium, webkit, devices, expect } from '@playwright/test';

const repository = resolve(import.meta.dir, '..');
const temporary = await mkdtemp(join(tmpdir(), 'specanto-starter-'));
const processes: ReturnType<typeof Bun.spawn>[] = [];
async function command(args: string[], cwd: string) {
  const child = Bun.spawn(args, { cwd, stdout: 'inherit', stderr: 'inherit' });
  if (await child.exited !== 0) throw new Error(`Starter command failed: ${args.join(' ')}`);
}
async function port(): Promise<number> {
  const server = createServer();
  return new Promise((resolvePort, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const address = server.address(); if (!address || typeof address === 'string') return reject(new Error('No port')); server.close(() => resolvePort(address.port)); });
  });
}
async function ready(url: string) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* startup */ }
    await Bun.sleep(100);
  }
  throw new Error(`Server did not start: ${url}`);
}

try {
  let archive = process.env.SPECANTO_STARTER_TARBALL ? resolve(repository, process.env.SPECANTO_STARTER_TARBALL) : '';
  if (!archive) {
    await command(['bun', 'run', 'build:lib'], repository);
    archive = join(temporary, 'candidate.tgz');
    await command(['bun', 'pm', 'pack', '--filename', archive], repository);
  }
  const tool = join(temporary, 'tool'); await mkdir(tool);
  await writeFile(join(tool, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { '@specanto/react': `file:${archive}`, express: '5.3.0' } }));
  await command(['bun', 'install'], tool);
  await command(['node', join(tool, 'node_modules/@specanto/react/cli/index.mjs'), '--help'], tool);
  await command(['bun', join(tool, 'node_modules/@specanto/react/cli/index.mjs'), '--help'], tool);
  const apiPort = await port(); const docsPort = await port();
  const api = `http://127.0.0.1:${apiPort}`; const docs = `http://127.0.0.1:${docsPort}`;
  await writeFile(join(tool, 'backend.mjs'), `import express from 'express';
const app = express(); let calls = 0;
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/request-count', (_req, res) => res.json({ calls }));
app.get('/recipes', (_req, res) => { calls++; res.json([{ id: 'recipe_1', title: 'Salade de saison' }]); });
app.post('/recipes', (req, res) => res.status(201).json({ body: req.body, authorization: req.headers.authorization }));
app.listen(${apiPort}, '127.0.0.1');\n`);
  processes.push(Bun.spawn(['node', 'backend.mjs'], { cwd: tool, stdout: 'ignore', stderr: 'inherit' }));
  await ready(`${api}/health`);
  // Exercise the documented bunx package/bin resolution, using the installed archive.
  await command(['bunx', '--package', '@specanto/react', 'specanto', 'init', 'reference', '--api-url', api], tool);
  const app = join(tool, 'reference');
  const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  const candidateVersion = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8')).version;
  if (manifest.dependencies['@specanto/react'] !== candidateVersion) throw new Error('Starter version differs from candidate');
  // Keep all application dependencies real; only choose the reviewed candidate instead of the unpublished registry version.
  manifest.dependencies['@specanto/react'] = `file:${archive}`;
  await writeFile(join(app, 'package.json'), JSON.stringify(manifest));
  await command(['bun', 'install'], app);
  await command(['bun', 'run', 'build'], app);
  await cp(join(app, '.env.example'), join(app, '.env.local'));
  processes.push(Bun.spawn(['bun', 'node_modules/vite/bin/vite.js', '--port', String(docsPort)], { cwd: app, stdout: 'ignore', stderr: 'inherit' }));
  await ready(docs);
  const direct = await fetch(`${api}/health`);
  if (direct.headers.has('access-control-allow-origin')) throw new Error('Backend unexpectedly enables CORS');
  for (const [name, browserType, options] of [['Chromium', chromium, {}], ['WebKit iPhone', webkit, devices['iPhone 13']]] as const) {
    const browser = await browserType.launch();
    try {
      const context = await browser.newContext(options); const page = await context.newPage();
      const errors: string[] = []; page.on('pageerror', cause => errors.push(cause.message));
      const before = (await (await fetch(`${api}/request-count`)).json()).calls;
      await page.goto(`${docs}/#operation/listRecipes`);
      await expect(page.getByRole('heading', { name: 'Lister les recettes', exact: true })).toBeVisible();
      await expect(page.locator('.sp-reference')).toBeVisible();
      expect((await (await fetch(`${api}/request-count`)).json()).calls).toBe(before);
      await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
      const response = page.getByRole('region', { name: 'Réponse HTTP réelle' });
      await expect(response).toContainText('200'); await expect(response).toContainText('Salade de saison');
      expect((await (await fetch(`${api}/request-count`)).json()).calls).toBe(before + 1);
      // Observe real proxy forwarding of JSON and Authorization from the same browser origin.
      const posted = await page.evaluate(async () => {
        const response = await fetch('/__specanto_api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fictional-starter-test' }, body: JSON.stringify({ title: 'Test' }) });
        return { status: response.status, body: await response.json() };
      });
      expect(posted).toEqual({ status: 201, body: { body: { title: 'Test' }, authorization: 'Bearer fictional-starter-test' } });
      expect(errors).toEqual([]);
      console.log(`${name}: generated app, exported CSS, manual real GET and proxy JSON/Bearer POST passed without backend CORS.`);
      await context.close();
    } finally { await browser.close(); }
  }
} finally {
  for (const child of processes) child.kill();
  await Promise.all(processes.map(child => child.exited));
  await rm(temporary, { recursive: true, force: true });
}
