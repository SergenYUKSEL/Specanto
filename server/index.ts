import { resolve } from 'node:path';
import { handleApi } from './api';
import { createHandler } from './handler';

const root = resolve(import.meta.dir, '..');
const handler = createHandler(resolve(root, 'site-dist'), async (request) => {
  if (new URL(request.url).pathname === '/openapi.json' && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : Bun.file(resolve(root, 'fixtures/atelier.openapi.json')), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
  }
  return handleApi(request);
});

if (import.meta.main) {
  const server = Bun.serve({ port: Number(process.env.PORT || 3001), hostname: '0.0.0.0', fetch: handler, maxRequestBodySize: 2 * 1024 * 1024 });
  console.log(`Specanto demo listening on port ${server.port}`);
}
