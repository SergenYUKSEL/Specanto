import { describe, expect, test } from 'bun:test';
import { buildRequest, compareSpecs, parseSpec } from '../src/core';
import type { Operation } from '../src/core/types';

function document(schema: unknown = { type: 'object' }, openapi = '3.0.3') {
  return { openapi, info: { title: 'OpenAPI 3.0 fixture', version: '1' }, servers: [{ url: 'https://api.example.test' }], paths: {
    '/items': { post: { operationId: 'createItem', requestBody: { required: true, content: { 'application/json': { schema } } }, responses: {
      '201': { description: 'Created', content: { 'application/json': { schema } } },
    } } },
  } };
}
function request(operation: Operation, body: string) {
  return buildRequest(operation, { serverUrl: 'https://api.example.test', parameterValues: {}, credentials: {}, credentialOrigins: {}, body });
}

describe('OpenAPI 3.0 normalization and requests', () => {
  for (const version of ['3.0.0', '3.0.3', '3.0.4', '3.1.1']) {
    test(`accepts ${version} objects and JSON without mutating the input`, () => {
      const source = document(undefined, version), original = JSON.stringify(source);
      const normalized = parseSpec(source);
      expect(normalized.openapiVersion).toBe(version);
      expect(normalized.operations[0]?.requestBody?.supported).toBe(true);
      expect(request(normalized.operations[0]!, '{}').url).toBe('https://api.example.test/items');
      expect(parseSpec(original).operations[0]?.method).toBe('POST');
      expect(JSON.stringify(source)).toBe(original);
    });
  }
  test('loads 3.0 YAML with relative servers resolved against the source URL', () => {
    const normalized = parseSpec('openapi: 3.0.3\ninfo:\n  title: YAML 3.0\n  version: "1"\nservers:\n  - url: /v1\npaths:\n  /ping:\n    get:\n      responses:\n        "204":\n          description: Empty\n', 'https://api.example.test/docs/openapi.yaml');
    expect(normalized.openapiVersion).toBe('3.0.3');
    expect(buildRequest(normalized.operations[0]!, { serverUrl: '/v1', baseUrl: normalized.sourceUrl, parameterValues: {}, credentials: {}, credentialOrigins: {} }).url).toBe('https://api.example.test/v1/ping');
  });
  test('normalizes nested nullable fields and response schemas while retaining resolved source', () => {
    const source = document({ type: 'object', required: ['label'], properties: {
      label: { type: 'string', nullable: true },
      entries: { type: 'array', items: { type: 'integer', nullable: true } },
    } });
    const op = parseSpec(source).operations[0]!;
    expect(op.requestBody?.schema?.properties?.label?.type).toEqual(['string', 'null']);
    expect(op.responses[0]?.schema?.properties?.label?.type).toEqual(['string', 'null']);
    expect(op.requestBody?.rawSchema).toEqual(source.paths['/items'].post.requestBody.content['application/json'].schema);
    expect(request(op, '{"label":null,"entries":[null,2]}').body).toContain('null');
    expect(() => request(op, '{"entries":[]}')).toThrow(/required/i);
    expect(() => request(op, '{"label":3}')).toThrow(/string or null/i);
  });
  test('keeps enum restrictions even when nullable permits the null type', () => {
    const restricted = parseSpec(document({ type: 'string', nullable: true, enum: ['open'] })).operations[0]!;
    expect(() => request(restricted, 'null')).toThrow(/enum/i);
    const nullable = parseSpec(document({ type: 'string', nullable: true, enum: ['open', null] })).operations[0]!;
    expect(request(nullable, 'null').body).toBe('null');
  });
  test('does not widen the type for nullable false or nullable without an explicit type', () => {
    const op = parseSpec(document({ type: 'object', properties: {
      fixed: { type: 'string', nullable: false }, inferred: { properties: { id: { type: 'string' } }, nullable: true },
    } })).operations[0]!;
    expect(() => request(op, '{"fixed":null}')).toThrow(/string/i);
    expect(() => request(op, '{"inferred":null}')).toThrow(/object/i);
  });
  test('does not interpret example data or property names as schema keywords', () => {
    const schema = { type: 'object', properties: { nullable: { type: 'string', nullable: true } }, example: { type: 'string', nullable: true, exclusiveMinimum: true } };
    const normalized = parseSpec(document(schema)).operations[0]!.requestBody?.schema;
    expect(normalized?.example).toEqual(schema.example);
    expect(normalized?.properties?.nullable?.type).toEqual(['string', 'null']);
  });
  test('ignores 3.0 reference siblings but preserves 3.1 schema sibling behavior', () => {
    const source = { ...document({ $ref: '#/components/schemas/Label', nullable: true, type: 'integer' }), components: { schemas: { Label: { type: 'string' } } } };
    const older = parseSpec(source).operations[0]!;
    expect(older.requestBody?.schema?.type).toBe('string');
    expect(() => request(older, 'null')).toThrow(/string/i);
    expect(request(older, '"label"').body).toBe('"label"');
    const newer = parseSpec({ ...source, openapi: '3.1.1' }).operations[0]!;
    expect(newer.requestBody?.schema?.type).toBe('integer');
  });
  test('resolves referenced parameters, request bodies and responses under 3.0 rules', () => {
    const source = { ...document(), components: {
      parameters: { Count: { name: 'count', in: 'query', schema: { type: 'integer', nullable: true } } },
      requestBodies: { Body: { required: true, content: { 'application/json': { schema: { type: 'string', nullable: true } } } } },
      responses: { Created: { description: 'Original response', content: { 'application/json': { schema: { type: 'string', nullable: true } } } } },
    }, paths: { '/items': { post: {
      parameters: [{ $ref: '#/components/parameters/Count', required: true }], requestBody: { $ref: '#/components/requestBodies/Body', required: false },
      responses: { '201': { $ref: '#/components/responses/Created', description: 'Ignored sibling' } },
    } } } };
    const op = parseSpec(source).operations[0]!;
    expect(op.parameters[0]?.required).toBe(false);
    expect(op.parameters[0]?.schema?.type).toEqual(['integer', 'null']);
    expect(op.requestBody?.required).toBe(true);
    expect(op.responses[0]?.description).toBe('Original response');
    expect(request(op, 'null').body).toBe('null');
  });
  test('canonicalizes 3.0 exclusive bounds without claiming complete client validation', () => {
    const schema = { type: 'number', minimum: 2, maximum: 9, exclusiveMinimum: true, exclusiveMaximum: false };
    const op = parseSpec(document(schema)).operations[0]!;
    expect(op.requestBody?.schema?.exclusiveMinimum).toBe(2);
    expect(op.requestBody?.schema?.minimum).toBeUndefined();
    expect(op.requestBody?.schema?.maximum).toBe(9);
    expect(op.requestBody?.schema?.exclusiveMaximum).toBeUndefined();
    expect(op.requestBody?.rawSchema).toEqual(schema);
    expect(op.warnings.join(' ')).toContain('exclusiveMinimum');
  });
  test('compares equivalent 3.0 and 3.1 schemas without dialect-only changes', () => {
    const before = parseSpec(document({ type: 'number', nullable: true, minimum: 2, exclusiveMinimum: true }));
    const after = parseSpec(document({ type: ['number', 'null'], exclusiveMinimum: 2 }, '3.1.1'));
    expect(compareSpecs(before, after).changes).toEqual([]);
  });
  for (const schema of [{ type: ['string', 'null'] }, { type: 'null' }, { type: 'string', nullable: 'yes' }, { type: 'number', minimum: 2, exclusiveMinimum: 2 }, true]) {
    test(`rejects invalid 3.0 schema syntax ${JSON.stringify(schema)}`, () => {
      expect(() => parseSpec(document(schema))).toThrow(/3\.0/);
    });
  }
  test('allows boolean additionalProperties in 3.0 and preserves partial-validation warnings', () => {
    const op = parseSpec(document({ type: 'object', additionalProperties: false })).operations[0]!;
    expect(op.requestBody?.supported).toBe(true);
    expect(op.warnings.join(' ')).toContain('additionalProperties');
  });
  test('continues rejecting Swagger 2, OpenAPI 3.2 and malformed versions', () => {
    for (const version of ['2.0', '3.2.0', '3.0', '3.0.beta', '3.0.3-extra', ' 3.0.3']) expect(() => parseSpec(document(undefined, version))).toThrow(/3\.0.*3\.1/);
  });
});
