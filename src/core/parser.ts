import { parse as parseYaml } from 'yaml';
import { hasBooleanSchema, normalizeSchema } from './schema-shape';
import type { ApiResponse, HttpMethod, NormalizedSpec, Operation, Parameter, RequestBody, Schema, SecurityRequirement, SecurityScheme, Server } from './types';

export const SPEC_BYTE_LIMIT = 2 * 1024 * 1024;
const MAX_DEPTH = 32;
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}
function string(value: unknown): string { return typeof value === 'string' ? value : ''; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function inspectDepth(value: unknown, depth = 0, ancestors = new Set<object>()): void {
  if (value === null || typeof value !== 'object') return;
  if (depth > MAX_DEPTH) throw new Error('The document exceeds the maximum depth of 32.');
  if (ancestors.has(value)) throw new Error('The supplied document contains an object cycle.');
  ancestors.add(value);
  for (const child of Object.values(value)) inspectDepth(child, depth + 1, ancestors);
  ancestors.delete(value);
}

function readDocument(input: string | object): RecordValue {
  let value: unknown;
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).byteLength > SPEC_BYTE_LIMIT) throw new Error('The document is too large (2 MiB limit).');
    try {
      const trimmed = input.trimStart();
      value = trimmed.startsWith('{') || trimmed.startsWith('[') ? JSON.parse(input) : parseYaml(input, { maxAliasCount: 10 });
    } catch (error) {
      throw new Error(`Invalid JSON or YAML document: ${error instanceof Error ? error.message : 'parse failure'}`, { cause: error });
    }
  } else {
    value = input;
  }
  inspectDepth(value);
  let serialized: string;
  try { serialized = JSON.stringify(value); } catch { throw new Error('The document is not a serializable object.'); }
  if (!serialized || new TextEncoder().encode(serialized).byteLength > SPEC_BYTE_LIMIT) throw new Error('The document is too large or empty (2 MiB limit).');
  const document = record(JSON.parse(serialized));
  if (!/^3\.[01]\.\d+$/.test(string(document.openapi))) throw new Error('Only OpenAPI 3.0.x and 3.1.x documents are supported.');
  const info = record(document.info);
  if (!string(info.title) || !string(info.version)) throw new Error('OpenAPI info.title and info.version are required.');
  if (!document.paths || Array.isArray(document.paths) || typeof document.paths !== 'object') throw new Error('OpenAPI paths must be an object.');
  return document;
}

function createResolver(document: RecordValue, warn: (message: string) => void) {
  const ignoreRefSiblings = string(document.openapi).startsWith('3.0.');
  let visited = 0;
  function resolve(value: unknown, depth = 0, chain: string[] = []): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (depth > MAX_DEPTH || ++visited > 100_000) {
      warn('Reference expansion reached its depth or node limit.');
      return { $ref: '#/unresolved-expansion-limit' };
    }
    if (Array.isArray(value)) return value.map(item => resolve(item, depth + 1, chain));
    const node = record(value);
    const ref = string(node.$ref);
    if (ref) {
      if (!ref.startsWith('#/')) {
        warn(`Remote or external reference is display-only: ${ref}`);
        return { ...node };
      }
      if (chain.includes(ref)) {
        warn(`Cyclic reference is display-only: ${ref}`);
        return { ...node };
      }
      let target: unknown = document;
      try {
        const pointer = decodeURIComponent(ref.slice(2));
        for (const segment of pointer.split('/')) {
          const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
          const parent = target !== null && typeof target === 'object' ? target as RecordValue : {};
          if (!Object.hasOwn(parent, key)) { target = undefined; break; }
          target = parent[key];
        }
      } catch { target = undefined; }
      if (target === undefined) {
        warn(`Missing internal reference: ${ref}`);
        return { ...node };
      }
      const siblings = Object.fromEntries(Object.entries(node).filter(([key]) => key !== '$ref'));
      const resolvedTarget = resolve(target, depth + 1, [...chain, ref]);
      if (ignoreRefSiblings) {
        if (Object.keys(siblings).length) warn(`OpenAPI 3.0 reference siblings were ignored: ${ref}`);
        return resolvedTarget;
      }
      if (typeof resolvedTarget === 'boolean') {
        warn(`Boolean schema reference is display-only: ${ref}`);
        return Object.keys(siblings).length ? { ...node } : resolvedTarget;
      }
      return { ...record(resolvedTarget), ...record(resolve(siblings, depth + 1, chain)) };
    }
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, resolve(child, depth + 1, chain)]));
  }
  return resolve;
}

function hasReference(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (string(record(value).$ref)) return true;
  return Object.values(value).some(hasReference);
}

function normalizeServers(value: unknown, warn: (message: string) => void): Server[] {
  return list(value).flatMap(item => {
    const server = record(item);
    let url = string(server.url);
    if (!url) { warn('A server without a URL was ignored.'); return []; }
    const variables = record(server.variables);
    url = url.replace(/\{([^}]+)\}/g, (token: string, key: string) => {
      const defaultValue = record(variables[key]).default;
      if (defaultValue === undefined) { warn(`Server variable has no default: ${key}`); return token; }
      return String(defaultValue);
    });
    return [{ url, ...(string(server.description) ? { description: string(server.description) } : {}) }];
  });
}

function normalizeParameter(value: unknown, dialect: '3.0' | '3.1'): Parameter | undefined {
  const node = record(value);
  const location = string(node.in);
  if (!string(node.name) || !['path', 'query', 'header', 'cookie'].includes(location)) return undefined;
  const schema = normalizeSchema(node.schema, `parameter ${location}:${string(node.name)} schema`, dialect);
  const type = Array.isArray(schema?.type) ? schema.type.find(item => item !== 'null') : schema?.type;
  const scalar = !type || ['string', 'number', 'integer', 'boolean'].includes(type);
  const style = string(node.style) || (location === 'query' || location === 'cookie' ? 'form' : 'simple');
  const array = type === 'array' && ['string', 'number', 'integer', 'boolean'].includes(string(record(schema?.items).type));
  const supported = !hasReference(node) && !hasBooleanSchema(node.schema) && !node.content && (
    (location === 'path' || location === 'header') && scalar && style === 'simple'
    || location === 'query' && (scalar || array) && style === 'form'
  );
  return {
    name: string(node.name), in: location as Parameter['in'], required: location === 'path' || node.required === true,
    description: string(node.description), schema, rawSchema: node.schema, example: node.example, style,
    explode: typeof node.explode === 'boolean' ? node.explode : style === 'form', supported,
  };
}

function firstMedia(content: unknown): [string, RecordValue] | undefined {
  const media = record(content);
  const key = Object.keys(media).find(name => name === 'application/json' || name.endsWith('+json')) ?? Object.keys(media)[0];
  return key ? [key, record(media[key])] : undefined;
}

function mediaExample(media: RecordValue): unknown {
  if (media.example !== undefined) return media.example;
  const first = Object.values(record(media.examples))[0];
  return record(first).value;
}

function normalizeBody(value: unknown, dialect: '3.0' | '3.1'): RequestBody | undefined {
  if (value === undefined) return undefined;
  const node = record(value);
  const media = firstMedia(node.content);
  const mediaType = media?.[0] ?? '';
  return {
    required: node.required === true, description: string(node.description), mediaType,
    schema: normalizeSchema(media?.[1].schema, 'request body schema', dialect), rawSchema: media?.[1].schema,
    example: media ? mediaExample(media[1]) : undefined,
    supported: Boolean(media && (mediaType === 'application/json' || mediaType.endsWith('+json')) && !hasReference(node) && !hasBooleanSchema(media[1].schema)),
  };
}

function normalizeResponses(value: unknown, dialect: '3.0' | '3.1'): ApiResponse[] {
  return Object.entries(record(value)).map(([status, item]) => {
    const node = record(item);
    const media = firstMedia(node.content);
    return { status, description: string(node.description), contentType: media?.[0], schema: normalizeSchema(media?.[1].schema, `response ${status} schema`, dialect), rawSchema: media?.[1].schema, example: media ? mediaExample(media[1]) : undefined };
  });
}

function normalizeSecurity(value: unknown): SecurityRequirement[] {
  return list(value).map(item => Object.fromEntries(Object.entries(record(item)).map(([name, scopes]) => [name, strings(scopes)])));
}

function validSecurity(value: unknown): boolean {
  return value === undefined || Array.isArray(value) && value.every(item =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
    && Object.values(item).every(scopes => Array.isArray(scopes) && scopes.every(scope => typeof scope === 'string')),
  );
}

const UNVALIDATED_KEYWORDS = new Set(['nullable', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else', 'dependentSchemas', 'dependentRequired', 'pattern', 'patternProperties', 'additionalProperties', 'unevaluatedProperties', 'unevaluatedItems', 'contains', 'minContains', 'maxContains', 'uniqueItems', 'const', 'multipleOf', 'minLength', 'maxLength', 'exclusiveMinimum', 'exclusiveMaximum', 'prefixItems', 'propertyNames', 'format']);

function unvalidatedKeywords(schema: Schema | undefined): string[] {
  const keywords = new Set<string>();
  function visit(value: unknown): void {
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (UNVALIDATED_KEYWORDS.has(key)) keywords.add(key);
      if (key !== 'example' && key !== 'examples' && key !== 'default' && key !== 'enum') visit(child);
    }
  }
  visit(schema);
  return [...keywords];
}

export function parseSpec(input: string | object, sourceUrl?: string): NormalizedSpec {
  const document = readDocument(input);
  const dialect = string(document.openapi).startsWith('3.0.') ? '3.0' : '3.1';
  const warnings = new Set<string>();
  const warn = (message: string) => { warnings.add(message); };
  const resolve = createResolver(document, warn);
  const info = record(document.info);
  const rootServers = normalizeServers(document.servers ?? [{ url: '/' }], warn);
  const securitySchemes: Record<string, SecurityScheme> = Object.fromEntries(
    Object.entries(record(record(document.components).securitySchemes)).map(([name, item]) => {
      const node = record(resolve(item));
      const supported = !hasReference(node) && (node.type === 'http' && string(node.scheme).toLowerCase() === 'bearer' || node.type === 'apiKey' && node.in === 'header' && Boolean(string(node.name)));
      return [name, { type: string(node.type), scheme: string(node.scheme), in: string(node.in), name: string(node.name), description: string(node.description), supported }];
    }),
  );
  const operations: Operation[] = [];
  const ids = new Set<string>();
  for (const [path, rawPath] of Object.entries(record(document.paths))) {
    if (!path.startsWith('/')) { warn(`Invalid path was ignored: ${path}`); continue; }
    const pathItem = record(string(record(rawPath).$ref) ? resolve(rawPath) : rawPath);
    for (const method of METHODS) {
      if (!Object.hasOwn(pathItem, method)) continue;
      const before = new Set(warnings);
      const op = record(resolve(pathItem[method]));
      const pathParameters = list(resolve(pathItem.parameters));
      const rawParameters = [...pathParameters, ...list(op.parameters)];
      const parameters = new Map<string, Parameter>();
      const unsupported: string[] = [];
      if (hasReference(op) && string(op.$ref) || string(pathItem.$ref)) unsupported.push('An unresolved operation or path reference prevents execution.');
      for (const rawParameter of rawParameters) {
        const parameter = normalizeParameter(rawParameter, dialect);
        if (!parameter) { unsupported.push('An unresolved or invalid parameter prevents execution.'); continue; }
        parameters.set(`${parameter.in}:${parameter.name}`, parameter);
      }
      for (const parameter of parameters.values()) {
        if (!parameter.supported) unsupported.push(`Unsupported parameter serialization or reference: ${parameter.in}:${parameter.name}`);
        if (hasBooleanSchema(parameter.rawSchema)) warn(`Boolean request parameter schema is display-only: ${method.toUpperCase()} ${path} ${parameter.in}:${parameter.name}`);
      }
      const requestBody = normalizeBody(op.requestBody, dialect);
      if (requestBody && !requestBody.supported) unsupported.push(`Unsupported request body media type, schema or reference: ${requestBody.mediaType || 'unresolved'}`);
      if (hasBooleanSchema(requestBody?.rawSchema)) warn(`Boolean request body schema is display-only: ${method.toUpperCase()} ${path}`);
      const responses = normalizeResponses(op.responses, dialect);
      for (const response of responses) {
        if (hasBooleanSchema(response.rawSchema)) warn(`Boolean response schema is display-only: ${method.toUpperCase()} ${path} ${response.status}`);
      }
      const unvalidated = [...new Set([...parameters.values()].flatMap(parameter => unvalidatedKeywords(parameter.schema)).concat(unvalidatedKeywords(requestBody?.schema)))];
      if (unvalidated.length) warn(`Partial client validation for ${method.toUpperCase()} ${path}: ${unvalidated.join(', ')} remain visible but are not validated.`);
      const security = Object.hasOwn(op, 'security') ? op.security : document.security;
      if (!validSecurity(security)) unsupported.push('Invalid security declaration prevents execution.');
      const operationServers = normalizeServers(op.servers ?? pathItem.servers ?? document.servers ?? [{ url: '/' }], warn);
      let id = string(op.operationId) || `${method}-${path}`;
      if (ids.has(id)) { warn(`Duplicate operationId: ${id}`); id = `${id}-${method}-${path}`; }
      ids.add(id);
      operations.push({
        id, method: method.toUpperCase() as HttpMethod, path,
        summary: string(op.summary) || `${method.toUpperCase()} ${path}`, description: string(op.description),
        tags: strings(op.tags), parameters: [...parameters.values()], requestBody,
        responses, security: normalizeSecurity(security),
        securitySchemes, servers: operationServers, warnings: [...warnings].filter(message => !before.has(message)), unsupported,
      });
    }
  }
  return {
    openapiVersion: string(document.openapi),
    title: string(info.title), version: string(info.version), description: string(info.description),
    servers: rootServers, tags: list(document.tags).map(item => ({ name: string(record(item).name), description: string(record(item).description) })),
    operations, warnings: [...warnings], sourceUrl,
  };
}
