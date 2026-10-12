import type { Operation, Schema } from './types';
import { hasBooleanSchema } from './schema-shape';

export function searchOperations(operations: Operation[], query: string): Operation[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return operations;
  return operations.filter(operation => {
    const haystack = [operation.id, operation.method, operation.path, operation.summary, operation.description, ...operation.tags].join(' ').toLocaleLowerCase();
    return words.every(word => haystack.includes(word));
  });
}

export function schemaTypes(schema?: Schema): string[] {
  if (!schema) return [];
  if (Array.isArray(schema.type)) return schema.type;
  if (schema.type) return [schema.type];
  if (schema.properties || schema.required) return ['object'];
  if (schema.items) return ['array'];
  return [];
}

export function exampleForSchema(schema?: Schema): unknown {
  if (hasBooleanSchema(schema)) return undefined;
  return schemaExample(schema, 0, new Set());
}

function schemaExample(schema: Schema | undefined, depth: number, ancestors: Set<Schema>): unknown {
  if (!schema || schema.$ref || depth > 32 || ancestors.has(schema)) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.examples?.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  ancestors.add(schema);
  const type = schemaTypes(schema).find(item => item !== 'null');
  let value: unknown;
  if (type === 'object') {
    value = Object.fromEntries(Object.entries(schema.properties ?? {}).slice(0, 100).flatMap(([name, property]) => {
      const example = schemaExample(property, depth + 1, ancestors);
      return example === undefined ? [] : [[name, example]];
    }));
  } else if (type === 'array') {
    const example = schemaExample(schema.items, depth + 1, ancestors);
    value = example === undefined ? [] : [example];
  } else if (type === 'integer' || type === 'number') {
    value = typeof schema.minimum === 'number' ? schema.minimum : 0;
  } else if (type === 'boolean') {
    value = true;
  } else if (type === 'string') {
    const formats: Record<string, string> = { email: 'hello@example.com', uri: 'https://example.com', uuid: '00000000-0000-4000-8000-000000000000', date: '2026-01-01', 'date-time': '2026-01-01T00:00:00Z' };
    value = formats[schema.format ?? ''] ?? 'string';
  } else if (schemaTypes(schema).includes('null')) {
    value = null;
  }
  ancestors.delete(schema);
  return value;
}

export function validateSchema(value: unknown, schema: Schema | undefined, label: string, depth = 0): void {
  if (!schema) return;
  if (depth > 32 || schema.$ref) throw new Error(`Unsupported schema reference or depth at ${label}.`);
  const types = schemaTypes(schema);
  const matches = (type: string) => {
    if (type === 'null') return value === null;
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === type;
  };
  if (types.length && !types.some(matches)) throw new Error(`${label} must be ${types.join(' or ')}.`);
  if (schema.enum && !schema.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) throw new Error(`${label} is not an allowed enum value.`);
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) throw new Error(`${label} must be at least ${schema.minimum}.`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) throw new Error(`${label} must be at most ${schema.maximum}.`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) throw new Error(`${label} needs at least ${schema.minItems} items.`);
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) throw new Error(`${label} allows at most ${schema.maxItems} items.`);
    value.forEach((item, index) => validateSchema(item, schema.items, `${label}[${index}]`, depth + 1));
  } else if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(object, required)) throw new Error(`Required field ${label}.${required} is missing.`);
    }
    for (const [name, child] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(object, name)) validateSchema(object[name], child, `${label}.${name}`, depth + 1);
    }
  }
}
