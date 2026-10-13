import { describe, expect, test } from 'bun:test';
import { buildRequest, exampleForSchema, httpTransport, loadSpec, parseSpec, searchOperations, toCurl } from '../src/core';
import type { Operation, RequestInput } from '../src/core';

function document(paths: Record<string, unknown> = { '/products': { get: { summary: 'List products', tags: ['Shop'], responses: { '200': { description: 'Product list' } } } } }) {
  return { openapi: '3.1.1', info: { title: 'Atelier', version: '1.0' }, servers: [{ url: 'https://api.example.test/v1' }], paths };
}

function operation(details: Record<string, unknown> = {}, path = '/products/{id}') {
  const normalized = parseSpec(document({ [path]: { post: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: {}, ...details } } }));
  return normalized.operations[0] as Operation;
}
function input(overrides: Partial<RequestInput> = {}): RequestInput {
  return { serverUrl: 'https://api.example.test/v1', parameterValues: { 'path:id': 'oak / dark' }, credentials: {}, credentialOrigins: {}, ...overrides };
}

describe('OpenAPI normalization', () => {
  test('accepts JSON, YAML and objects without mutating the source', () => {
    const source = document();
    const original = JSON.stringify(source);
    expect(parseSpec(source).operations[0]?.summary).toBe('List products');
    expect(parseSpec(original).operations[0]?.method).toBe('GET');
    expect(parseSpec('openapi: 3.1.1\ninfo:\n  title: YAML API\n  version: "1"\npaths:\n  /ping:\n    get:\n      responses:\n        "204":\n          description: Empty\n').title).toBe('YAML API');
    expect(JSON.stringify(source)).toBe(original);
  });

  test('rejects malformed, incompatible, too large and too deep documents', () => {
    expect(() => parseSpec('{oops')).toThrow();
    expect(() => parseSpec({ ...document(), openapi: '3.2.0' })).toThrow(/3\.1/);
    expect(() => parseSpec({ ...document(), info: { title: 'a'.repeat(2 * 1024 * 1024), version: '1' } })).toThrow(/large|limit|MiB/i);
    let nested: unknown = 'leaf';
    for (let index = 0; index < 34; index++) nested = { child: nested };
    expect(() => parseSpec({ ...document(), extra: nested })).toThrow(/depth|deep/i);
  });

  test('inherits path parameters and applies operation overrides by location and name', () => {
    const normalized = parseSpec(document({ '/products/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } }],
      get: { parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: {} },
    } }));
    expect(normalized.operations[0]?.parameters.map(parameter => [parameter.in, parameter.name, parameter.schema?.default])).toEqual([['path', 'id', undefined], ['query', 'limit', 20]]);
  });

  test('uses operation servers then path servers and substitutes declared defaults', () => {
    const normalized = parseSpec(document({ '/products': {
      servers: [{ url: 'https://path.example.test' }],
      get: { servers: [{ url: 'https://{region}.example.test/{version}', variables: { region: { default: 'eu' }, version: { default: 'v2' } } }], responses: {} },
      post: { responses: {} },
    } }));
    expect(normalized.operations[0]?.servers[0]?.url).toBe('https://eu.example.test/v2');
    expect(normalized.operations[1]?.servers[0]?.url).toBe('https://path.example.test');
  });

  test('resolves internal JSON pointers and keeps cycles and remote references visible with warnings', () => {
    const source = { ...document({ '/products': { post: {
      requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } } },
      responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: 'https://example.test/schema.json' } } } } },
    } } }), components: { schemas: { Item: { type: 'object', properties: { label: { $ref: '#/components/schemas/a~1b' }, child: { $ref: '#/components/schemas/Item' } } }, 'a/b': { type: 'string', example: 'oak' } } } };
    const result = parseSpec(source);
    expect(result.operations[0]?.requestBody?.schema?.properties?.label?.example).toBe('oak');
    expect(result.warnings.join(' ')).toMatch(/cycl|recurs/i);
    expect(result.warnings.join(' ')).toMatch(/remote|external/i);
    expect(result.operations[0]?.unsupported.join(' ')).toMatch(/ref|cycl|recurs/i);
    expect(result.operations[0]?.responses[0]?.schema?.$ref).toBe('https://example.test/schema.json');
  });

  test('warns on absent internal references and blocks unresolved request parameters', () => {
    const result = parseSpec(document({ '/products': { get: { parameters: [{ $ref: '#/components/parameters/Absent' }], responses: {} } } }));
    expect(result.warnings.join(' ')).toMatch(/missing|absent|not found/i);
    expect(result.operations[0]?.unsupported.length).toBeGreaterThan(0);
  });

  test('resolves JSON pointers into schema arrays and preserves advanced schemas with a validation warning', () => {
    const result = parseSpec({ ...document({ '/products': { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', allOf: [{ $ref: '#/components/schemas/Composite/allOf/0' }] } } } }, responses: {} } } }), components: { schemas: { Composite: { allOf: [{ type: 'object', properties: { label: { type: 'string' } } }] } } } });
    const schema = result.operations[0]?.requestBody?.schema;
    expect((schema?.allOf as { properties?: { label?: { type: string } } }[])[0]?.properties?.label?.type).toBe('string');
    expect(result.operations[0]?.requestBody?.supported).toBe(true);
    expect(result.operations[0]?.warnings.join(' ')).toMatch(/partial|validation|validated/i);
  });

  test('rejects malformed security declarations rather than treating them as public operations', () => {
    const result = parseSpec({ ...document(), security: { Bearer: [] } });
    expect(result.operations[0]?.unsupported.join(' ')).toMatch(/security/i);
    expect(() => buildRequest(result.operations[0] as Operation, input())).toThrow(/security/i);
  });

  test('keeps inherited security alternatives, including AND requirements and public overrides', () => {
    const source = { ...document({ '/products': { get: { responses: {} }, post: { security: [], responses: {} } } }),
      security: [{ Bearer: [], Key: [] }, { Key: [] }],
      components: { securitySchemes: { Bearer: { type: 'http', scheme: 'bearer' }, Key: { type: 'apiKey', in: 'header', name: 'X-API-Key' }, Cookie: { type: 'apiKey', in: 'cookie', name: 'key' } } },
    };
    const result = parseSpec(source);
    expect(result.operations[0]?.security).toEqual([{ Bearer: [], Key: [] }, { Key: [] }]);
    expect(result.operations[1]?.security).toEqual([]);
    expect(result.operations[0]?.securitySchemes.Key?.supported).toBe(true);
    expect(result.operations[0]?.securitySchemes.Cookie?.supported).toBe(false);
  });

  test('marks object query parameters and non-JSON request bodies as unsupported', () => {
    const result = parseSpec(document({ '/products': { post: {
      parameters: [{ name: 'filter', in: 'query', style: 'deepObject', schema: { type: 'object' } }],
      requestBody: { content: { 'multipart/form-data': { schema: { type: 'object' } } } }, responses: {},
    } } }));
    expect(result.operations[0]?.parameters[0]?.supported).toBe(false);
    expect(result.operations[0]?.requestBody?.supported).toBe(false);
  });

  test('blocks boolean request schemas rather than discarding their constraints', () => {
    const result = parseSpec({ ...document({ '/products': { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Never' } } } }, responses: {} } } }), components: { schemas: { Never: false } } });
    expect(result.operations[0]?.requestBody?.supported).toBe(false);
    expect(() => buildRequest(result.operations[0] as Operation, input({ body: '{}' }))).toThrow(/unsupported/i);
    const nested = operation({ requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { never: false } } } } } });
    expect(nested.requestBody?.supported).toBe(false);
  });

  test.each([false, true])('preserves literal boolean %s request schemas for source inspection without inventing examples', (schema) => {
    const op = operation({ parameters: [{ name: 'flag', in: 'query', schema }], requestBody: { content: { 'application/json': { schema } } } }, '/products');
    expect(op.requestBody?.rawSchema).toBe(schema);
    expect(op.requestBody?.schema).toBeUndefined();
    expect(op.requestBody?.supported).toBe(false);
    expect(exampleForSchema(op.requestBody?.schema)).toBeUndefined();
    expect(op.parameters[0]?.rawSchema).toBe(schema);
    expect(op.parameters[0]?.schema).toBeUndefined();
    expect(op.warnings.join(' ')).toMatch(/boolean.*request|request.*boolean/i);
  });

  test.each([false, true])('preserves literal boolean %s response schemas and warns that they are display-only', (schema) => {
    const op = operation({ responses: { '200': { description: 'Boolean schema', content: { 'application/json': { schema } } } } });
    expect(op.responses[0]?.rawSchema).toBe(schema);
    expect(op.responses[0]?.schema).toBeUndefined();
    expect(exampleForSchema(op.responses[0]?.schema)).toBeUndefined();
    expect(op.warnings.join(' ')).toMatch(/boolean.*response|response.*boolean/i);
    expect(op.unsupported).toEqual([]);
  });

  test('preserves boolean referenced schemas as their literal value for source inspection', () => {
    const result = parseSpec({ ...document({ '/products': { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Never' } } } }, responses: { '200': { description: 'Any value', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anything' } } } } } } } }), components: { schemas: { Never: false, Anything: true } } });
    expect(result.operations[0]?.requestBody?.rawSchema).toBe(false);
    expect(result.operations[0]?.responses[0]?.rawSchema).toBe(true);
    expect(result.operations[0]?.requestBody?.supported).toBe(false);
  });

  test('preserves nested boolean schemas without fabricating a generated example', () => {
    const schema = { type: 'object', required: ['never'], properties: { never: false } };
    const op = operation({ requestBody: { content: { 'application/json': { schema } } }, responses: { '200': { description: 'Never valid', content: { 'application/json': { schema } } } } });
    expect(op.requestBody?.rawSchema).toEqual({ type: 'object', required: ['never'], properties: { never: false } });
    expect(op.responses[0]?.rawSchema).toEqual({ type: 'object', required: ['never'], properties: { never: false } });
    expect(exampleForSchema(op.responses[0]?.schema)).toBeUndefined();
  });

  const malformedSchemas = [
    { type: 'string', enum: 'open' }, { type: 'object', required: 'name' }, { type: 'object', required: [1] },
    { type: 'object', properties: [] }, { type: 'object', properties: { name: 'string' } },
    { type: 'array', items: [] }, { type: 'array', items: 1 },
    { type: 1 }, { type: ['string', 'mystery'] }, { type: 'mystery' },
    { anyOf: {} }, { allOf: ['string'] }, { oneOf: [null] },
  ];
  for (const schema of malformedSchemas) {
    test(`rejects malformed request schema ${JSON.stringify(schema)} before consumers render it`, () => {
      expect(() => operation({ requestBody: { content: { 'application/json': { schema } } } })).toThrow(/schema/i);
    });
    test(`rejects malformed response schema ${JSON.stringify(schema)} before consumers render it`, () => {
      expect(() => operation({ responses: { '200': { description: 'Result', content: { 'application/json': { schema } } } } })).toThrow(/schema/i);
    });
  }
});

describe('Operation discovery and examples', () => {
  test('searches case-insensitive words across methods, paths, descriptions and tags', () => {
    const operations = parseSpec(document({ '/products': { get: { summary: 'Browse products', description: 'Find wood furniture', tags: ['Shop'], responses: {} }, post: { summary: 'Add item', tags: ['Admin'], responses: {} } } })).operations;
    expect(searchOperations(operations, 'GET wood')).toEqual([operations[0]]);
    expect(searchOperations(operations, '  ADMIN  ')).toEqual([operations[1]]);
    expect(searchOperations(operations, 'unknown')).toEqual([]);
    expect(searchOperations(operations, '')).toEqual(operations);
  });

  test('prefers explicit examples and builds bounded object and array examples', () => {
    expect(exampleForSchema({ type: 'string', example: '', default: 'default' })).toBe('');
    expect(exampleForSchema({ type: 'string', examples: ['first'], enum: ['enum'] })).toBe('first');
    expect(exampleForSchema({ type: 'object', properties: { name: { type: 'string', default: 'chair' }, quantity: { type: 'integer', minimum: 1 }, enabled: { type: 'boolean' }, tags: { type: 'array', items: { type: 'string', enum: ['oak'] } } } })).toEqual({ name: 'chair', quantity: 1, enabled: true, tags: ['oak'] });
    expect(exampleForSchema({ $ref: '#/Unresolved' })).toBeUndefined();
  });
});

describe('Request preparation', () => {
  test('encodes path values and serializes form arrays with the chosen explode behavior', () => {
    const op = operation({ parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'tag', in: 'query', schema: { type: 'array', items: { type: 'string' } } }, { name: 'size', in: 'query', explode: false, schema: { type: 'array', items: { type: 'integer' } } }, { name: 'X-Label', in: 'header', schema: { type: 'string' } }] });
    const request = buildRequest(op, input({ parameterValues: { 'path:id': 'oak / dark', 'query:tag': '["oak","a & b"]', 'query:size': '1, 2', 'header:X-Label': 'quiet' } }));
    expect(request.url).toBe('https://api.example.test/v1/products/oak%20%2F%20dark?tag=oak&tag=a+%26+b&size=1%2C2');
    expect(request.headers['X-Label']).toBe('quiet');
    expect(request.hasSecrets).toBe(false);
  });

  test('requires an explicit base for relative servers and only permits HTTP destinations without URL secrets', () => {
    const op = operation();
    expect(() => buildRequest(op, input({ serverUrl: '/api' }))).toThrow(/base|relative/i);
    expect(buildRequest(op, input({ serverUrl: '/api', baseUrl: 'https://docs.example.test/openapi.json' })).url).toBe('https://docs.example.test/api/products/oak%20%2F%20dark');
    expect(() => buildRequest(op, input({ serverUrl: 'file:///tmp/api' }))).toThrow(/http/i);
    expect(() => buildRequest(op, input({ serverUrl: 'https://user:pass@example.test/api' }))).toThrow(/credential|password|user/i);
    expect(() => buildRequest(op, input({ serverUrl: 'https://{region}.example.test' }))).toThrow(/variable|server|URL/i);
  });

  test('rejects missing parameters, invalid scalar types and unsupported serialization', () => {
    expect(() => buildRequest(operation(), input({ parameterValues: {} }))).toThrow(/required|id/i);
    const integer = operation({ parameters: [{ name: 'count', in: 'query', required: true, schema: { type: 'integer' } }] }, '/products');
    expect(() => buildRequest(integer, input({ parameterValues: { 'query:count': '1.2' } }))).toThrow(/integer/i);
    const unsupported = operation({ parameters: [{ name: 'filter', in: 'query', style: 'deepObject', schema: { type: 'object' } }] }, '/products');
    expect(() => buildRequest(unsupported, input())).toThrow(/unsupported/i);
  });

  test('accepts JSON bodies and validates syntax, declared types and nested required fields', () => {
    const op = operation({ requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['customer'], properties: { customer: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } } } } } });
    expect(buildRequest(op, input({ body: '{"customer":{"email":"a@example.test"}}' })).headers['Content-Type']).toBe('application/json');
    expect(() => buildRequest(op, input())).toThrow(/required/i);
    expect(() => buildRequest(op, input({ body: '{oops' }))).toThrow(/JSON/i);
    expect(() => buildRequest(op, input({ body: '{"customer":{}}' }))).toThrow(/email/i);
    expect(() => buildRequest(op, input({ body: 'null' }))).toThrow(/object/i);
  });

  test('validates enum membership and nullable JSON types without treating null as a string', () => {
    const enumBody = operation({ requestBody: { content: { 'application/json': { schema: { type: 'string', enum: ['draft', 'ready'] } } } } }, '/products');
    expect(buildRequest(enumBody, input({ body: '"draft"' })).body).toBe('"draft"');
    expect(() => buildRequest(enumBody, input({ body: '"unknown"' }))).toThrow(/enum/i);
    const nullable = operation({ requestBody: { content: { 'application/json': { schema: { type: ['string', 'null'] } } } } }, '/products');
    expect(buildRequest(nullable, input({ body: 'null' })).body).toBe('null');
    expect(buildRequest(nullable, input({ body: '"name"' })).body).toBe('"name"');
    expect(() => buildRequest(nullable, input({ body: '42' }))).toThrow(/string or null/i);
  });

  test('enforces inclusive numeric minimum and maximum on request bodies and parameters', () => {
    const numeric = operation({ parameters: [{ name: 'count', in: 'query', required: true, schema: { type: 'integer', minimum: 2, maximum: 5 } }] }, '/products');
    for (const value of ['2', '5']) expect(buildRequest(numeric, input({ parameterValues: { 'query:count': value } })).url).toContain(`count=${value}`);
    expect(() => buildRequest(numeric, input({ parameterValues: { 'query:count': '1' } }))).toThrow(/at least 2/i);
    expect(() => buildRequest(numeric, input({ parameterValues: { 'query:count': '6' } }))).toThrow(/at most 5/i);
    const body = operation({ requestBody: { content: { 'application/json': { schema: { type: 'number', minimum: -0.5, maximum: 1.5 } } } } }, '/products');
    for (const value of ['-0.5', '1.5']) expect(buildRequest(body, input({ body: value })).body).toBe(value);
    expect(() => buildRequest(body, input({ body: '-0.6' }))).toThrow(/at least/i);
    expect(() => buildRequest(body, input({ body: '1.6' }))).toThrow(/at most/i);
  });

  test('enforces minItems, maxItems and nested item constraints', () => {
    const op = operation({ requestBody: { content: { 'application/json': { schema: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'integer', minimum: 1 } } } } } }, '/products');
    for (const body of ['[1]', '[1,2]']) expect(buildRequest(op, input({ body })).body).toBe(body);
    expect(() => buildRequest(op, input({ body: '[]' }))).toThrow(/at least 1 items/i);
    expect(() => buildRequest(op, input({ body: '[1,2,3]' }))).toThrow(/at most 2 items/i);
    expect(() => buildRequest(op, input({ body: '[0]' }))).toThrow(/\[0\].*at least 1/i);
  });

  test('refuses browser-controlled headers and line breaks', () => {
    for (const name of ['Host', 'Cookie', 'Content-Length', 'Sec-Fetch-Site', 'Proxy-Authorization']) {
      const op = operation({ parameters: [{ name, in: 'header', schema: { type: 'string' } }] }, '/products');
      expect(() => buildRequest(op, input({ parameterValues: { [`header:${name}`]: 'x' } }))).toThrow(/header|forbidden|browser/i);
    }
    const op = operation({ parameters: [{ name: 'X-Label', in: 'header', schema: { type: 'string' } }] }, '/products');
    expect(() => buildRequest(op, input({ parameterValues: { 'header:X-Label': 'ok\r\nX-Other: leaked' } }))).toThrow(/header|line|invalid/i);
  });

  test('requires every AND credential, permits OR selection, and binds secrets to the final origin', () => {
    const op = operation();
    op.security = [{ Bearer: [], Key: [] }, { Key: [] }];
    op.securitySchemes = { Bearer: { type: 'http', scheme: 'bearer', supported: true }, Key: { type: 'apiKey', in: 'header', name: 'X-API-Key', supported: true } };
    const credentials = { Bearer: 'private-token', Key: 'private-key' };
    const credentialOrigins = { Bearer: 'https://api.example.test', Key: 'https://api.example.test' };
    expect(() => buildRequest(op, input({ credentials: { Bearer: 'private-token' }, credentialOrigins }))).toThrow(/Key|credential/i);
    const request = buildRequest(op, input({ credentials, credentialOrigins }));
    expect(request.headers.Authorization).toBe('Bearer private-token');
    expect(request.headers['X-API-Key']).toBe('private-key');
    expect(request.hasSecrets).toBe(true);
    expect(request.secretHeaders).toEqual(['Authorization', 'X-API-Key']);
    expect(buildRequest(op, input({ credentials: { Key: 'private-key' }, credentialOrigins, authAlternative: 1 })).headers.Authorization).toBeUndefined();
    expect(() => buildRequest(op, input({ credentials, credentialOrigins, serverUrl: 'https://other.example.test' }))).toThrow(/origin|destination/i);
    expect(() => buildRequest(op, input({ credentials, credentialOrigins: {}, authAlternative: 1 }))).toThrow(/origin|destination/i);
    expect(() => buildRequest(op, input({ credentials, credentialOrigins, authAlternative: 99 }))).toThrow(/alternative|security/i);
  });

  test('refuses case-insensitive header collisions with auth and unsupported auth schemes', () => {
    const op = operation({ parameters: [{ name: 'authorization', in: 'header', schema: { type: 'string' } }] }, '/products');
    op.security = [{ Bearer: [] }];
    op.securitySchemes = { Bearer: { type: 'http', scheme: 'bearer', supported: true } };
    expect(() => buildRequest(op, input({ parameterValues: { 'header:authorization': 'custom' }, credentials: { Bearer: 'private' }, credentialOrigins: { Bearer: 'https://api.example.test' } }))).toThrow(/collision|duplicate|already/i);
    op.securitySchemes.Bearer = { type: 'oauth2', supported: false };
    expect(() => buildRequest(op, input())).toThrow(/unsupported/i);
  });

  test('redacts secret headers by default and safely quotes apostrophes in POSIX cURL', () => {
    const request = { url: 'https://api.example.test/a?name=oak', method: 'POST' as const, headers: { Authorization: 'Bearer private', 'X-Label': "it's oak" }, body: "{\"label\":\"it's oak\"}", hasSecrets: true, secretHeaders: ['Authorization'] };
    const curl = toCurl(request);
    expect(curl).not.toContain('private');
    expect(curl).toContain('Authorization: <redacted>');
    expect(curl).toContain("'X-Label: it'\\''s oak'");
    expect(toCurl(request, true)).toContain('Bearer private');
  });
});

describe('Bounded HTTP loading and transport', () => {
  test('loads JSON and YAML specifications over real HTTP and records the final document URL', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === '/redirect') return Response.redirect(new URL('/spec.yaml', request.url), 302);
      if (path === '/spec.yaml') return new Response('openapi: 3.1.1\ninfo: { title: HTTP YAML, version: "1" }\npaths: {}\n');
      if (path === '/error') return new Response('Denied', { status: 403 });
      return Response.json(document());
    } });
    try {
      expect((await loadSpec(new URL('/spec.json', server.url).href)).title).toBe('Atelier');
      const yaml = await loadSpec(new URL('/redirect', server.url).href);
      expect(yaml.title).toBe('HTTP YAML');
      expect(yaml.sourceUrl).toBe(new URL('/spec.yaml', server.url).href);
      await expect(loadSpec(new URL('/error', server.url).href)).rejects.toThrow(/403/);
      await expect(loadSpec('file:///tmp/spec.json')).rejects.toThrow(/HTTP/i);
    } finally { server.stop(true); }
  });

  test('rejects oversize streamed specification imports even without Content-Length', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('{"padding":"'));
        controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1).fill(97));
        controller.close();
      } }));
    } });
    try { await expect(loadSpec(server.url.href)).rejects.toThrow(/large|limit|MiB/i); }
    finally { server.stop(true); }
  });

  test('returns HTTP failures as response results while preserving request method, headers and body', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', async fetch(request) {
      return Response.json({ method: request.method, body: await request.json(), label: request.headers.get('X-Label'), cookie: request.headers.get('Cookie') }, { status: 422, headers: { 'X-Response': 'seen' } });
    } });
    try {
      const result = await httpTransport({ url: server.url.href, method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Label': 'oak' }, body: '{"quantity":2}', hasSecrets: false, secretHeaders: [] });
      expect(result.status).toBe(422);
      expect(result.headers['x-response']).toBe('seen');
      expect(JSON.parse(result.body)).toEqual({ method: 'POST', body: { quantity: 2 }, label: 'oak', cookie: null });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    } finally { server.stop(true); }
  });

  test('bounds streamed response text to 100 KiB and marks truncation', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new Uint8Array(200_000).fill(97));
        controller.close();
      } }));
    } });
    try {
      const result = await httpTransport({ url: server.url.href, method: 'GET', headers: {}, hasSecrets: false, secretHeaders: [] });
      expect(result.body.length).toBe(100 * 1024);
      expect(result.truncated).toBe(true);
    } finally { server.stop(true); }
  });

  test('follows public redirects and refuses credentialed redirects before exposing a secret', async () => {
    const receivedSecrets: string[] = [];
    const receiver = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(request) {
      receivedSecrets.push(request.headers.get('Authorization') ?? '');
      return new Response('redirect target');
    } });
    const redirector = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() { return Response.redirect(receiver.url, 302); } });
    try {
      expect((await httpTransport({ url: redirector.url.href, method: 'GET', headers: {}, hasSecrets: false, secretHeaders: [] })).body).toBe('redirect target');
      expect(receivedSecrets).toEqual(['']);
      await expect(httpTransport({ url: redirector.url.href, method: 'GET', headers: { Authorization: 'Bearer private' }, hasSecrets: true, secretHeaders: ['Authorization'] })).rejects.toThrow(/network|redirect|transport/i);
      expect(receivedSecrets).toEqual(['']);
    } finally { receiver.stop(true); redirector.stop(true); }
  });

  test('distinguishes transport cancellation from HTTP errors without retrying', async () => {
    let received = 0;
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() { received++; return new Response('ok'); } });
    const controller = new AbortController();
    controller.abort();
    try {
      await expect(httpTransport({ url: server.url.href, method: 'GET', headers: {}, hasSecrets: false, secretHeaders: [] }, controller.signal)).rejects.toMatchObject({ name: 'TransportError', kind: 'abort' });
      expect(received).toBe(0);
    } finally { server.stop(true); }
  });

  test('aborts a request while its HTTP response stream is still active', async () => {
    let received = 0;
    let markReceived: (() => void) | undefined;
    const started = new Promise<void>(resolve => { markReceived = resolve; });
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      received++;
      markReceived?.();
      return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('partial')); } }));
    } });
    const controller = new AbortController();
    try {
      const request = httpTransport({ url: server.url.href, method: 'GET', headers: {}, hasSecrets: false, secretHeaders: [] }, controller.signal);
      await started;
      controller.abort();
      await expect(request).rejects.toMatchObject({ name: 'TransportError', kind: 'abort' });
      expect(received).toBe(1);
    } finally { server.stop(true); }
  });

  test('classifies connection failures as network errors', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() { return new Response('unused'); } });
    const url = server.url.href;
    server.stop(true);
    await expect(httpTransport({ url, method: 'GET', headers: {}, hasSecrets: false, secretHeaders: [] })).rejects.toMatchObject({ name: 'TransportError', kind: 'network' });
  });
});
