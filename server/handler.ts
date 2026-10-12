import { resolve, sep } from 'node:path';

export function createHandler(staticRoot: string, api: (request: Request) => Promise<Response | null>) {
  const root = resolve(staticRoot);
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({ status: 'ok', service: 'specanto-demo' });
    }
    const apiResponse = await api(request);
    if (apiResponse) return apiResponse;
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response('Invalid path', { status: 400 }); }
    const path = resolve(root, '.' + pathname);
    if ((!path.startsWith(root + sep) && path !== root) || pathname.includes('\0') || pathname.includes('\\')) return new Response('Forbidden', { status: 403 });
    const entry = ['/', '/demo', '/demo/', '/compare', '/compare/'].includes(pathname);
    const file = Bun.file(entry ? resolve(root, 'index.html') : path);
    if (!await file.exists()) return new Response('Not found', { status: 404 });
    const headers = new Headers({
      'Content-Type': file.type,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    });
    return new Response(request.method === 'HEAD' ? null : file, { headers });
  };
}
