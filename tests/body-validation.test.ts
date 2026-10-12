import { describe, expect, test } from 'bun:test';
import { formatJsonBody, inspectJsonBody, jsonBodyExample } from '../src/core/body-validation';
import type { Schema } from '../src/core/types';

const order: Schema = {
  type: 'object', required: ['items'], properties: {
    items: { type: 'array', minItems: 1, maxItems: 2, items: {
      type: 'object', required: ['quantity'], properties: {
        quantity: { type: 'integer', minimum: 1, maximum: 99 },
        variant: { type: 'string', enum: ['oak', 'black'] },
      },
    } },
    note: { type: ['string', 'null'] },
  },
};

describe('guided JSON body validation', () => {
  test('formats valid JSON only on request, including scalar bodies', () => {
    expect(formatJsonBody('{"items":[{"quantity":2}]}')).toEqual({ ok: true, value: '{\n  "items": [\n    {\n      "quantity": 2\n    }\n  ]\n}' });
    expect(formatJsonBody(' null ')).toEqual({ ok: true, value: 'null' });
    expect(formatJsonBody('false')).toEqual({ ok: true, value: 'false' });
    expect(formatJsonBody('"text"')).toEqual({ ok: true, value: '"text"' });
  });

  test('preserves invalid JSON text exactly when formatting fails', () => {
    const text = '  {"items": [\n';
    const result = formatJsonBody(text);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(text);
    if (!result.ok) expect(result.message).toMatch(/JSON invalide/);
  });

  test('formatting preserves numeric precision, escapes and duplicate keys', () => {
    expect(formatJsonBody('{"id":9007199254740993,"scale":1.00,"label":"\\u00e9","id":2}')).toEqual({ ok: true, value: '{\n  "id": 9007199254740993,\n  "scale": 1.00,\n  "label": "\\u00e9",\n  "id": 2\n}' });
    expect(formatJsonBody('{"text":"[\\"test\\"]","empty":[]}')).toEqual({ ok: true, value: '{\n  "text": "[\\"test\\"]",\n  "empty": []\n}' });
  });

  test('distinguishes optional empty bodies from required ones without inserting a value', () => {
    expect(inspectJsonBody(' \n ', { schema: order })).toEqual({ state: 'empty', valid: true });
    expect(inspectJsonBody('', { schema: order, required: true })).toEqual({ state: 'empty', valid: false, path: '$', message: 'Le corps JSON est requis.' });
  });

  test('locates nested numeric constraints using the existing engine', () => {
    expect(inspectJsonBody('{"items":[{"quantity":0}]}', { schema: order })).toEqual({ state: 'schema-error', valid: false, path: '$.items[0].quantity', message: '$.items[0].quantity doit être supérieur ou égal à 1.' });
    expect(inspectJsonBody('{"items":[{"quantity":100}]}', { schema: order }).message).toContain('$.items[0].quantity doit être inférieur ou égal à 99');
  });

  test('locates required properties, types and enum values', () => {
    expect(inspectJsonBody('{"items":[{}]}', { schema: order }).path).toBe('$.items[0].quantity');
    expect(inspectJsonBody('{"items":[{"quantity":"two"}]}', { schema: order }).message).toContain('$.items[0].quantity doit être de type entier');
    expect(inspectJsonBody('{"items":[{"quantity":2,"variant":"pine"}]}', { schema: order }).message).toContain('$.items[0].variant ne fait pas partie des valeurs autorisées');
  });

  test('reports supported array bounds and accepts nullable values', () => {
    expect(inspectJsonBody('{"items":[]}', { schema: order }).message).toContain('$.items doit contenir au moins 1 élément');
    expect(inspectJsonBody('{"items":[{"quantity":1},{"quantity":2},{"quantity":3}]}', { schema: order }).message).toContain('$.items doit contenir au plus 2 éléments');
    expect(inspectJsonBody('{"items":[{"quantity":1}],"note":null}', { schema: order })).toEqual({ state: 'valid', valid: true });
  });

  test('only validates JSON syntax when there is no schema', () => {
    expect(inspectJsonBody('{"custom":true}')).toEqual({ state: 'valid', valid: true });
    expect(inspectJsonBody('{"custom":')).toMatchObject({ state: 'syntax-error', valid: false });
  });

  test('does not claim validity or invent examples for boolean schemas', () => {
    expect(inspectJsonBody('{}', { rawSchema: false })).toMatchObject({ state: 'unsupported', valid: false });
    expect(inspectJsonBody('{}', { rawSchema: true })).toMatchObject({ state: 'unsupported', valid: false });
    const booleanChild = { type: 'object', properties: { never: false } };
    expect(inspectJsonBody('{}', { rawSchema: booleanChild })).toMatchObject({ state: 'unsupported', valid: false });
    expect(jsonBodyExample(undefined, false)).toBeUndefined();
    expect(jsonBodyExample(undefined, true)).toBeUndefined();
    expect(jsonBodyExample(undefined, booleanChild)).toBeUndefined();
  });

  test('prefers explicit examples including false, null and empty string', () => {
    expect(jsonBodyExample({ type: 'boolean' }, undefined, false)).toBe('false');
    expect(jsonBodyExample({ type: 'null' }, undefined, null)).toBe('null');
    expect(jsonBodyExample({ type: 'string' }, undefined, '')).toBe('""');
    expect(jsonBodyExample({ type: 'integer', minimum: 3 })).toBe('3');
    expect(jsonBodyExample(undefined)).toBeUndefined();
  });

  test('reports unresolved schema references with the same path as the request engine', () => {
    expect(inspectJsonBody('{}', { schema: { $ref: '#/missing' } })).toMatchObject({ state: 'schema-error', valid: false, path: '$' });
  });
});
