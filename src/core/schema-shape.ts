import type { Schema } from './types';

const TYPES = new Set(['null', 'string', 'number', 'integer', 'boolean', 'array', 'object']);
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export function hasBooleanSchema(value: unknown): boolean {
  if (typeof value === 'boolean') return true;
  if (!isObject(value)) return false;
  const properties = isObject(value.properties) ? Object.values(value.properties) : [];
  const compositions = ['allOf', 'anyOf', 'oneOf', 'prefixItems'].flatMap(name => Array.isArray(value[name]) ? value[name] : []);
  const children = [...properties, value.items, value.not, value.if, value.then, value.else, ...compositions];
  return children.some(child => child !== undefined && hasBooleanSchema(child));
}

/** Check the fields consumed by the reference UI; this is not semantic JSON Schema validation. */
function checkSchema(value: unknown, label: string, depth = 0): void {
  if (typeof value === 'boolean') return;
  if (!isObject(value)) throw new Error(`Invalid ${label}: a schema must be an object or boolean.`);
  if (depth > 32) throw new Error(`Invalid ${label}: schema depth exceeds 32.`);
  if (Object.hasOwn(value, 'type')) {
    const types = Array.isArray(value.type) ? value.type : [value.type];
    if (!types.length || types.some(type => typeof type !== 'string' || !TYPES.has(type))) throw new Error(`Invalid ${label}.type: use a recognized schema type or array of types.`);
  }
  for (const name of ['title', 'description', 'format', '$ref']) {
    if (Object.hasOwn(value, name) && typeof value[name] !== 'string') throw new Error(`Invalid ${label}.${name}: expected a string.`);
  }
  for (const name of ['enum', 'examples']) {
    if (Object.hasOwn(value, name) && !Array.isArray(value[name])) throw new Error(`Invalid ${label}.${name}: expected an array.`);
  }
  if (Object.hasOwn(value, 'required') && (!Array.isArray(value.required) || value.required.some(name => typeof name !== 'string'))) throw new Error(`Invalid ${label}.required: expected an array of strings.`);
  for (const name of ['properties', 'patternProperties', '$defs']) {
    if (!Object.hasOwn(value, name)) continue;
    const children = value[name];
    if (!isObject(children)) throw new Error(`Invalid ${label}.${name}: expected an object containing schemas.`);
    for (const [key, child] of Object.entries(children)) checkSchema(child, `${label}.${name}.${key}`, depth + 1);
  }
  for (const name of ['items', 'not', 'if', 'then', 'else', 'additionalProperties']) {
    if (Object.hasOwn(value, name)) checkSchema(value[name], `${label}.${name}`, depth + 1);
  }
  for (const name of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
    if (!Object.hasOwn(value, name)) continue;
    const children = value[name];
    if (!Array.isArray(children)) throw new Error(`Invalid ${label}.${name}: expected an array of schemas.`);
    children.forEach((child, index) => checkSchema(child, `${label}.${name}[${index}]`, depth + 1));
  }
}

export function normalizeSchema(value: unknown, label: string): Schema | undefined {
  if (value === undefined) return undefined;
  checkSchema(value, label);
  // Preserve boolean schemas separately as source; their execution is unsupported.
  return typeof value === 'boolean' ? undefined : value as Schema;
}
