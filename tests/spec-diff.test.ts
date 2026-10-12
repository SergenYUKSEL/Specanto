import { describe, expect, test } from 'bun:test';
import { parseSpec } from '../src/core/parser';
import type { NormalizedSpec, Operation, Schema } from '../src/core/types';
import { compareSpecs } from '../src/core/spec-diff';

function document(operation: Record<string, unknown> = {}, extras: Record<string, unknown> = {}) {
  return { openapi: '3.1.1', info: { title: 'Example', version: '1' }, paths: { '/items': { post: { responses: { '200': { description: 'OK' } }, ...operation } } }, ...extras };
}
function compare(before: Record<string, unknown>, after: Record<string, unknown>) {
  return compareSpecs(parseSpec(document(before)), parseSpec(document(after)));
}
function body(schema: unknown, required = false) {
  return { requestBody: { required, content: { 'application/json': { schema } } } };
}
function codes(report: ReturnType<typeof compareSpecs>) { return report.changes.map(change => change.code); }

describe('OpenAPI comparison', () => {
  test('matches routes by method and path and ignores editorial metadata and operation identifiers', () => {
    const before = document({ operationId: 'old', summary: 'Old', description: 'Old', tags: ['A'], ...body({ type: 'string', description: 'Old', example: 'secret-before' }) });
    const after = document({ operationId: 'new', summary: 'New', description: 'New', tags: ['B'], ...body({ type: 'string', description: 'New', example: 'secret-after' }) }, { info: { title: 'Renamed', version: '2' }, servers: [{ url: 'https://new.example.test' }] });
    expect(compareSpecs(parseSpec(before), parseSpec(after)).changes).toEqual([]);
  });

  test('reports operation additions and removals in deterministic order', () => {
    const before = parseSpec(document({}, { paths: { '/z': { get: { responses: {} } }, '/items': { post: { responses: {} } } } }));
    const after = parseSpec(document({}, { paths: { '/a': { get: { responses: {} } }, '/items': { post: { responses: {} } } } }));
    const report = compareSpecs(before, after);
    expect(report.changes.map(change => [change.path, change.severity, change.code])).toEqual([
      ['/a', 'added', 'operation-added'], ['/z', 'removed', 'operation-removed'],
    ]);
    expect(report.summary).toEqual({ added: 1, removed: 1, 'potentially-breaking': 0, changed: 0 });
  });

  test('compares parameter locations, required flags and effective serialization', () => {
    const parameter = { name: 'filter', in: 'query', schema: { type: 'string' } };
    expect(compare({ parameters: [parameter] }, { parameters: [{ ...parameter, style: 'form', explode: true }] }).changes).toEqual([]);
    expect(codes(compare({ parameters: [parameter] }, { parameters: [{ ...parameter, required: true, explode: false }] }))).toContain('parameter-required-changed');
    expect(codes(compare({ parameters: [parameter] }, { parameters: [{ ...parameter, required: true, explode: false }] }))).toContain('parameter-serialization-changed');
    const moved = compare({ parameters: [parameter] }, { parameters: [{ ...parameter, in: 'header' }] });
    expect(codes(moved)).toEqual(['parameter-location-changed']);
    expect(moved.changes[0]?.severity).toBe('potentially-breaking');
  });

  test('ignores parameter order and resolves equal internal references', () => {
    const first = { name: 'first', in: 'query', schema: { type: 'string' } };
    const second = { name: 'second', in: 'query', schema: { type: 'integer' } };
    const before = parseSpec(document({ parameters: [{ $ref: '#/components/parameters/First' }, second] }, { components: { parameters: { First: first } } }));
    const after = parseSpec(document({ parameters: [second, first] }));
    expect(compareSpecs(before, after).changes).toEqual([]);
  });

  test('detects required additions, nested property removals and array item type changes', () => {
    const before = { type: 'object', properties: { name: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } };
    const after = { type: 'object', required: ['id'], properties: { id: { type: 'integer' }, tags: { type: 'array', items: { type: 'integer' } } } };
    const report = compare(body(before), body(after));
    expect(codes(report)).toContain('schema-required-changed');
    expect(codes(report)).toContain('schema-property-removed');
    expect(codes(report)).toContain('schema-property-added');
    expect(report.changes.find(change => change.location.endsWith('/items/type') && change.code === 'schema-type-changed')?.severity).toBe('potentially-breaking');
  });

  test('identifies each field whose requirement changes with safe transition metadata', () => {
    const properties = { email: { type: 'string' }, 'customer/id': { type: 'integer' } };
    const report = compare(body({ type: 'object', properties, required: ['customer/id'] }), body({ type: 'object', properties, required: ['email'] }));
    expect(report.changes).toHaveLength(2);
    expect(report.changes.find(change => change.location === '/requestBody/schema/required/email')).toMatchObject({ code: 'schema-required-changed', beforeRequired: false, afterRequired: true, severity: 'potentially-breaking' });
    expect(report.changes.find(change => change.location === '/requestBody/schema/required/customer~1id')).toMatchObject({ code: 'schema-required-changed', beforeRequired: true, afterRequired: false, severity: 'changed' });
  });

  test('classifies request narrowing and response widening conservatively without serializing enum values', () => {
    const report = compare(body({ type: ['string', 'null'], enum: ['sensitive-old', 'sensitive-new', null], minLength: 1, maxLength: 10 }), body({ type: 'string', enum: ['sensitive-new'], minLength: 2, maxLength: 8 }));
    expect(report.changes.every(change => change.severity === 'potentially-breaking')).toBe(true);
    expect(codes(report)).toContain('schema-enum-changed');
    expect(codes(report)).toContain('schema-bound-changed');
    expect(JSON.stringify(report)).not.toContain('sensitive-');
    const response = (schema: unknown) => ({ responses: { '200': { description: 'OK', content: { 'application/json': { schema } } } } });
    expect(compare(response({ type: 'integer' }), response({ type: ['integer', 'null'] })).changes[0]?.severity).toBe('potentially-breaking');
    expect(compare(response({ enum: ['a'] }), response({ enum: ['a', 'b'] })).changes[0]?.severity).toBe('potentially-breaking');
  });

  test('recognizes integer as a subset of number and unordered type/enum/required sets', () => {
    expect(compare(body({ type: 'integer' }), body({ type: 'number' })).changes[0]?.severity).toBe('changed');
    expect(compare(body({ type: 'number' }), body({ type: 'integer' })).changes[0]?.severity).toBe('potentially-breaking');
    const left = { type: ['string', 'null'], enum: ['a', null], required: ['a', 'b'] };
    const right = { type: ['null', 'string'], enum: [null, 'a'], required: ['b', 'a'] };
    expect(compare(body(left), body(right)).changes).toEqual([]);
  });

  test('detects request body requirement/media changes and response status/content changes', () => {
    const report = compare(body({ type: 'string' }), { requestBody: { required: true, content: { 'text/plain': { schema: { type: 'string' } } } }, responses: { '201': { description: 'Created' } } });
    expect(codes(report)).toContain('request-body-required-changed');
    expect(codes(report)).toContain('request-body-media-changed');
    expect(codes(report)).toContain('response-added');
    expect(codes(report)).toContain('response-removed');
    const changed = compare({ responses: { '200': { description: 'OK', content: { 'text/plain': {} } } } }, { responses: { '200': { description: 'Fine', content: { 'application/json': {} } } } });
    expect(codes(changed)).toEqual(['response-media-changed']);
  });

  test('marks new response statuses as potentially breaking because clients may not handle them', () => {
    const report = compare({ responses: { '200': { description: 'OK' } } }, { responses: { '200': { description: 'OK' }, '201': { description: 'Created' }, '401': { description: 'Unauthorized' } } });
    expect(report.changes.map(change => [change.location, change.code, change.severity])).toEqual([
      ['/responses/201', 'response-added', 'potentially-breaking'], ['/responses/401', 'response-added', 'potentially-breaking'],
    ]);
  });

  test('normalizes OR alternatives, AND key ordering, scope order and redundant security alternatives', () => {
    const securitySchemes = { A: { type: 'apiKey', in: 'header', name: 'X-Key' }, B: { type: 'http', scheme: 'bearer' } };
    const before = parseSpec(document({ security: [{ A: ['write', 'read'], B: [] }, { A: [] }] }, { components: { securitySchemes } }));
    const after = parseSpec(document({ security: [{ A: [] }, { B: [], A: ['read', 'write'] }, { A: [] }] }, { components: { securitySchemes } }));
    expect(compareSpecs(before, after).changes).toEqual([]);
    expect(compare({ security: [] }, { security: [{}] }).changes).toEqual([]);
  });

  test('detects strengthened security and effective scheme changes without including descriptions', () => {
    const schemes = { Key: { type: 'apiKey', in: 'header', name: 'X-Key' } };
    const before = parseSpec(document({ security: [{}, { Key: [] }] }, { components: { securitySchemes: schemes } }));
    const after = parseSpec(document({ security: [{ Key: [] }] }, { components: { securitySchemes: { Key: { ...schemes.Key, name: 'X-Token' } } } }));
    const report = compareSpecs(before, after);
    expect(codes(report)).toContain('security-requirements-changed');
    expect(codes(report)).toContain('security-scheme-changed');
    expect(report.changes.every(change => change.severity === 'potentially-breaking')).toBe(true);
  });

  test('ignores unused security scheme changes', () => {
    const before = parseSpec(document({}, { components: { securitySchemes: { Unused: { type: 'apiKey', in: 'header', name: 'X-Key' } } } }));
    const after = parseSpec(document({}, { components: { securitySchemes: { Unused: { type: 'http', scheme: 'basic' } } } }));
    expect(compareSpecs(before, after).changes).toEqual([]);
  });

  test('ignores header-name casing in parameters and API key schemes', () => {
    const before = parseSpec(document({ parameters: [{ name: 'X-Trace', in: 'header', schema: { type: 'string' } }], security: [{ Key: [] }] }, { components: { securitySchemes: { Key: { type: 'apiKey', in: 'header', name: 'X-Key' } } } }));
    const after = parseSpec(document({ parameters: [{ name: 'x-trace', in: 'header', schema: { type: 'string' } }], security: [{ Key: [] }] }, { components: { securitySchemes: { Key: { type: 'apiKey', in: 'header', name: 'x-key' } } } }));
    expect(compareSpecs(before, after).changes).toEqual([]);
  });

  test('warns about unsupported schemas and references even if equal', () => {
    const schema = { type: 'string', pattern: 'secret-pattern', $ref: 'https://example.test/secret-reference' };
    const report = compare(body(schema), body(schema));
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toContain('secret-pattern');
    expect(JSON.stringify(report)).not.toContain('secret-reference');
    const advanced = compare(body({ type: 'string', pattern: '^a' }), body({ type: 'string', pattern: '^b' }));
    expect(codes(advanced)).toContain('schema-constraint-changed');
    expect(advanced.changes[0]?.severity).toBe('potentially-breaking');
  });

  test('preserves literal annotation-like property names and const values inside advanced constraints', () => {
    const oldSchema = { allOf: [{ properties: { description: { type: 'string' } } }], const: { title: 'old-private-value' } };
    const newSchema = { allOf: [{ properties: { description: { type: 'integer' } } }], const: { title: 'new-private-value' } };
    const report = compare(body(oldSchema), body(newSchema));
    expect(codes(report)).toEqual(['schema-constraint-changed']);
    expect(JSON.stringify(report)).not.toContain('private-value');
    expect(compare(body({ allOf: [{ type: 'string', description: 'Old docs' }] }), body({ allOf: [{ type: 'string', description: 'New docs' }] })).changes).toEqual([]);
  });

  test('treats required names containing separators as distinct sets', () => {
    const report = compare(body({ required: ['a', 'b'] }), body({ required: ['a\u0000b'] }));
    expect(codes(report)).toEqual(['schema-required-changed', 'schema-required-changed', 'schema-required-changed']);
  });

  test('keeps boolean schemas distinct and warns that their comparison is partial', () => {
    const report = compare(body(true), body(false));
    expect(codes(report)).toEqual(['schema-boolean-changed']);
    expect(report.changes[0]?.severity).toBe('potentially-breaking');
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  test('caps results at 500 and reports truncation', () => {
    const source = parseSpec(document());
    const after: NormalizedSpec = { ...source, operations: Array.from({ length: 700 }, (_, index) => ({ ...source.operations[0] as Operation, path: `/item-${String(index).padStart(4, '0')}` })) };
    const report = compareSpecs({ ...source, operations: [] }, after);
    expect(report.changes).toHaveLength(500);
    expect(report.truncated).toBe(true);
    expect(report.summary.added).toBe(500);
  });

  test('bounds cyclic and deeply nested externally supplied normalized schemas', () => {
    const source = parseSpec(document(body({ type: 'object' })));
    const schema: Schema = { type: 'object' }; schema.properties = { child: schema };
    const operation = source.operations[0] as Operation;
    const cyclic: NormalizedSpec = { ...source, operations: [{ ...operation, requestBody: { ...operation.requestBody!, schema, rawSchema: schema } }] };
    const report = compareSpecs(source, cyclic);
    expect(report.warnings.some(warning => /limit|cycle/i.test(warning))).toBe(true);
    expect(report.truncated).toBe(true);
    expect(report.changes.length).toBeLessThanOrEqual(500);
  });
});
