import { describe, expect, test } from 'bun:test';
import { toFetch, toPython } from '../src/core/snippets';
import type { PreparedRequest } from '../src/core/types';

function request(overrides: Partial<PreparedRequest> = {}): PreparedRequest {
  return { url: 'https://api.example.test/items?label=a%20b', method: 'GET', headers: {}, hasSecrets: false, secretHeaders: [], ...overrides };
}

async function runFetch(snippet: string): Promise<{ url: string; options: RequestInit }> {
  let captured: { url: string; options: RequestInit } | undefined;
  const run = new Function('fetch', 'console', `return (async () => { ${snippet}\n })();`);
  await run(async (url: string, options: RequestInit) => {
    captured = { url, options };
    return new Response('sample', { status: 200 });
  }, { log: () => {} });
  if (!captured) throw new Error('The generated example did not call Fetch.');
  return captured;
}

async function runPython(snippet: string): Promise<Record<string, unknown>> {
  const runner = `import json, sys, types
captured = {}
class Session:
    trust_env = True
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def request(self, **kwargs):
        captured.update(kwargs)
        captured['trust_env'] = self.trust_env
        if 'data' in captured:
            captured['data'] = captured['data'].decode('utf-8')
        return types.SimpleNamespace(status_code=200, text='sample')
sys.modules['requests'] = types.SimpleNamespace(Session=Session)
source = json.load(sys.stdin)['snippet']
exec(compile(source, '<generated example>', 'exec'), {'print': lambda *args: None})
print(json.dumps(captured))
`;
  const child = Bun.spawn(['python3', '-c', runner], {
    stdin: new TextEncoder().encode(JSON.stringify({ snippet })), stdout: 'pipe', stderr: 'pipe',
  });
  const [stdout, stderr, status] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (status !== 0) throw new Error(`Python example failed: ${stderr}`);
  return JSON.parse(stdout) as Record<string, unknown>;
}

describe('Fetch snippets', () => {
  test('generates an executable GET without a body and omits browser credentials', async () => {
    const source = request();
    const result = await runFetch(toFetch(source));
    expect(result.url).toBe(source.url);
    expect(result.options.method).toBe('GET');
    expect(Object.hasOwn(result.options, 'body')).toBe(false);
    expect(result.options.credentials).toBe('omit');
    expect(result.options.redirect).toBe('follow');
    expect(result.options.referrerPolicy).toBe('no-referrer');
  });

  test('preserves POST text, unusual header names, Unicode, quotes and newlines', async () => {
    const headers = Object.fromEntries([['Content-Type', 'application/json'], ['__proto__', 'ordinary-header'], ['X-Label', 'quoted "value" \\ and café']]);
    const body = '{\n  "label": "L’été \\"東京\\" 🪴",\n  "note": "line\\nnext"\n}\n';
    const source = request({ method: 'POST', url: 'https://api.example.test/items?q="quoted"&tag=été', headers, body });
    const result = await runFetch(toFetch(source));
    expect(result.url).toBe(source.url);
    expect(result.options.body).toBe(body);
    expect(Object.fromEntries(new Headers(result.options.headers))).toEqual(Object.fromEntries([
      ['content-type', 'application/json'], ['__proto__', 'ordinary-header'], ['x-label', 'quoted "value" \\ and café'],
    ]));
  });

  test('keeps an explicitly empty body', async () => {
    const result = await runFetch(toFetch(request({ method: 'POST', body: '' })));
    expect(result.options.body).toBe('');
  });

  test('redacts marked headers case-insensitively and rejects credentialed redirects', async () => {
    const source = request({ headers: { aUtHoRiZaTiOn: 'Bearer private-token', 'x-api-key': 'private-key', Accept: 'application/json' }, secretHeaders: ['AUTHORIZATION', 'X-API-KEY'], hasSecrets: true });
    const snippet = toFetch(source);
    expect(snippet).not.toContain('private-token');
    expect(snippet).not.toContain('private-key');
    const result = await runFetch(snippet);
    const headers = new Headers(result.options.headers);
    expect(headers.get('authorization')).toBe('<redacted>');
    expect(headers.get('x-api-key')).toBe('<redacted>');
    expect(headers.get('accept')).toBe('application/json');
    expect(result.options.redirect).toBe('error');
  });

  test('only includes secrets after explicit opt-in without mutating the request', async () => {
    const source = request({ headers: { Authorization: 'Bearer private-token' }, hasSecrets: true, secretHeaders: ['Authorization'] });
    const before = JSON.stringify(source);
    const result = await runFetch(toFetch(source, true));
    expect(new Headers(result.options.headers).get('authorization')).toBe('Bearer private-token');
    expect(result.options.redirect).toBe('error');
    expect(JSON.stringify(source)).toBe(before);
  });

  test('protects Authorization even when a custom request omits secret metadata', async () => {
    const result = await runFetch(toFetch(request({ headers: { authorization: 'Bearer private-token' } })));
    expect(new Headers(result.options.headers).get('authorization')).toBe('<redacted>');
    expect(result.options.redirect).toBe('error');
  });
});

describe('Python snippets', () => {
  test('generates an executable GET without a body or implicit environment authentication', async () => {
    const source = request();
    const result = await runPython(toPython(source));
    expect(result.method).toBe('GET');
    expect(result.url).toBe(source.url);
    expect(Object.hasOwn(result, 'data')).toBe(false);
    expect(result.trust_env).toBe(false);
    expect(result.allow_redirects).toBe(true);
    expect(result.timeout).toBe(45);
  });

  test('sends original POST text as UTF-8 rather than JSON-encoding it again', async () => {
    const body = '{\n  "label": "L’été \\"東京\\" 🪴",\n  "note": "line\\nnext"\n}\n';
    const headers = Object.fromEntries([['Content-Type', 'application/json'], ['__proto__', 'ordinary-header'], ['X-Label', 'quoted "value" \\ and café']]);
    const source = request({ method: 'POST', url: 'https://api.example.test/items?q="quoted"&tag=été', headers, body });
    const result = await runPython(toPython(source));
    expect(result.url).toBe(source.url);
    expect(result.method).toBe('POST');
    expect(result.data).toBe(body);
    expect(result.headers).toEqual(headers);
  });

  test('matches Fetch UTF-8 replacement of isolated surrogates while preserving paired Unicode', async () => {
    const body = '{"value":"' + String.fromCharCode(0xd800) + ' 🪴 ' + String.fromCharCode(0xdc00) + '"}';
    expect(JSON.parse(body).value).toBe(String.fromCharCode(0xd800) + ' 🪴 ' + String.fromCharCode(0xdc00));
    const source = request({ method: 'POST', body });
    const fetched = await runFetch(toFetch(source));
    const transmittedBody = new TextDecoder().decode(await new Request(fetched.url, fetched.options).arrayBuffer());
    expect(transmittedBody).toBe('{"value":"� 🪴 �"}');
    const python = await runPython(toPython(source));
    expect(python.data).toBe(transmittedBody);
    expect(source.body).toBe(body);
  });

  test('keeps an explicitly empty body', async () => {
    const result = await runPython(toPython(request({ method: 'POST', body: '' })));
    expect(result.data).toBe('');
  });

  test('redacts marked headers case-insensitively and prevents credentialed redirects', async () => {
    const source = request({ headers: { aUtHoRiZaTiOn: 'Bearer private-token', 'x-api-key': 'private-key', Accept: 'application/json' }, secretHeaders: ['AUTHORIZATION', 'X-API-KEY'], hasSecrets: true });
    const snippet = toPython(source);
    expect(snippet).not.toContain('private-token');
    expect(snippet).not.toContain('private-key');
    const result = await runPython(snippet);
    expect(result.headers).toEqual({ aUtHoRiZaTiOn: '<redacted>', 'x-api-key': '<redacted>', Accept: 'application/json' });
    expect(result.allow_redirects).toBe(false);
  });

  test('only includes secrets after explicit opt-in without mutating the request', async () => {
    const source = request({ headers: { Authorization: 'Bearer private-token' }, hasSecrets: true, secretHeaders: ['Authorization'] });
    const before = JSON.stringify(source);
    const result = await runPython(toPython(source, true));
    expect(result.headers).toEqual({ Authorization: 'Bearer private-token' });
    expect(result.allow_redirects).toBe(false);
    expect(JSON.stringify(source)).toBe(before);
  });

  test('protects Authorization even when a custom request omits secret metadata', async () => {
    const result = await runPython(toPython(request({ headers: { authorization: 'Bearer private-token' } })));
    expect(result.headers).toEqual({ authorization: '<redacted>' });
    expect(result.allow_redirects).toBe(false);
  });
});
