import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, mkdir, rm, writeFile, readdir, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSpec } from '../src/core';

const cli = resolve('cli/index.mjs');
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function directory() { const root = await mkdtemp(join(tmpdir(), 'specanto-cli-')); roots.push(root); return root; }
async function run(cwd: string, ...args: string[]) {
  const child = Bun.spawn(['node', cli, ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [exit, out, error] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  expect(error).not.toContain('MODULE_NOT_FOUND');
  return { exit, out, error };
}

// A missing scaffold/file or wrong source URL makes the generated reference unusable.
test('init creates a parseable local reference without installing or modifying the parent', async () => {
  const root = await directory();
  const result = await run(root, 'init', 'mes docs', '--api-url', 'http://localhost:3001');
  expect(result.exit).toBe(0);
  const target = join(root, 'mes docs');
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  expect(manifest.private).toBe(true);
  expect(manifest.dependencies['@specanto/react']).toBe(JSON.parse(await readFile(resolve('package.json'), 'utf8')).version);
  const document = parseSpec(await readFile(join(target, 'public/openapi.json'), 'utf8'), 'http://localhost:5193/openapi.json');
  expect(document.operations[0].path).toBe('/recipes');
  expect(document.operations[0].servers[0].url).toBe('/__specanto_api');
  expect(await readdir(root)).toEqual(['mes docs']);
  expect(await readdir(target)).not.toContain('node_modules');
  expect(result.out).toContain('bun install');
});

// Overwrite protection must run before any file is replaced, including a symlink target.
test('init refuses existing directories even when empty', async () => {
  const root = await directory(); await mkdir(join(root, 'docs'));
  const result = await run(root, 'init', 'docs');
  expect(result.exit).toBe(1);
  expect(await readdir(join(root, 'docs'))).toEqual([]);
});
test('init preserves existing files and follows no target symlink', async () => {
  const root = await directory(); await mkdir(join(root, 'real')); await writeFile(join(root, 'real/keep'), 'untouched'); await symlink(join(root, 'real'), join(root, 'docs'));
  expect((await run(root, 'init', 'docs')).exit).toBe(1);
  expect(await readFile(join(root, 'real/keep'), 'utf8')).toBe('untouched');
  expect(await readdir(join(root, 'real'))).toEqual(['keep']);
});

// Invalid arguments must not create a partially configured destination.
for (const url of ['file:///tmp/api', 'https://user:secret@example.com', 'http://localhost:3001/api', 'http://localhost:3001?token=secret', 'http://localhost:3001/#x', 'not-a-url']) {
  test(`init rejects unsupported API target ${url}`, async () => {
    const root = await directory(); expect((await run(root, 'init', 'docs', '--api-url', url)).exit).toBe(1); expect(await readdir(root)).toEqual([]);
  });
}
for (const args of [['init'], ['generate', 'docs'], ['init', 'docs', '--unknown'], ['init', 'docs', '--api-url'], ['init', 'docs', 'extra'], ['init', 'docs', '--api-url', 'http://localhost:3001', '--api-url', 'http://localhost:3002']]) {
  test(`invalid command creates no files: ${args.join(' ')}`, async () => {
    const root = await directory(); expect((await run(root, ...args)).exit).toBe(1); expect(await readdir(root)).toEqual([]);
  });
}
test('help works without creating files', async () => {
  const root = await directory(); expect((await run(root, '--help')).exit).toBe(0); expect(await readdir(root)).toEqual([]);
});
