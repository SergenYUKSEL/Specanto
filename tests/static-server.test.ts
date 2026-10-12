import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHandler } from '../server/handler';

const root = await mkdtemp(join(tmpdir(), 'specanto-static-'));
await mkdir(join(root, 'assets'));
await writeFile(join(root, 'index.html'), '<!doctype html><title>Specanto</title>');
await writeFile(join(root, 'assets', 'app.js'), 'console.log("safe");');
const handler = createHandler(root, async () => null);
afterAll(() => rm(root, { recursive: true, force: true }));

describe('demo static server boundaries', () => {
  test('serves the demo route as a browser entry', async () => {
    const result = await handler(new Request('http://local/demo'));
    expect(result.status).toBe(200);
    expect(result.headers.get('content-type')).toContain('text/html');
    expect(await result.text()).toContain('<title>Specanto</title>');
  });
  test('serves the comparison route as a browser entry', async () => {
    const result = await handler(new Request('http://local/compare'));
    expect(result.status).toBe(200);
    expect(await result.text()).toContain('<title>Specanto</title>');
  });
  test('serves a real asset rather than the HTML entry', async () => {
    const result = await handler(new Request('http://local/assets/app.js'));
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('console.log("safe");');
  });
  test('does not turn a missing asset into successful HTML', async () => {
    expect((await handler(new Request('http://local/assets/missing.js'))).status).toBe(404);
  });
  test('rejects encoded paths escaping the static root', async () => {
    expect((await handler(new Request('http://local/%2e%2e%2fsecret.txt'))).status).toBe(403);
  });
  test('does not accept business verbs on a static page', async () => {
    expect((await handler(new Request('http://local/demo', { method: 'POST' }))).status).toBe(405);
  });
  test('health endpoint reports server readiness', async () => {
    const result = await handler(new Request('http://local/health'));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ status: 'ok', service: 'specanto-demo' });
  });
});
