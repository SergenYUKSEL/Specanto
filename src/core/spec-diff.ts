import type { HttpMethod, NormalizedSpec, Operation, Parameter, SecurityRequirement } from './types';

export type SpecDiffSeverity = 'added' | 'removed' | 'potentially-breaking' | 'changed';
export type SpecDiffCode =
  | 'operation-added' | 'operation-removed'
  | 'parameter-added' | 'parameter-removed' | 'parameter-location-changed' | 'parameter-required-changed' | 'parameter-serialization-changed'
  | 'request-body-added' | 'request-body-removed' | 'request-body-required-changed' | 'request-body-media-changed'
  | 'response-added' | 'response-removed' | 'response-media-changed'
  | 'schema-added' | 'schema-removed' | 'schema-boolean-changed' | 'schema-type-changed' | 'schema-enum-changed'
  | 'schema-required-changed' | 'schema-property-added' | 'schema-property-removed' | 'schema-bound-changed' | 'schema-constraint-changed'
  | 'security-requirements-changed' | 'security-scheme-changed';
export type SpecDiffChange = {
  method: HttpMethod;
  path: string;
  /** A JSON-pointer-like location within the normalized operation. */
  location: string;
  severity: SpecDiffSeverity;
  code: SpecDiffCode;
  /** Present for schema-required-changed; identifies the requirement transition without copying values. */
  beforeRequired?: boolean;
  afterRequired?: boolean;
  /** Fixed explanatory text; schema examples, enum values and credentials are never copied. */
  detail: string;
};
export type SpecDiffReport = {
  changes: SpecDiffChange[];
  warnings: string[];
  /** True when the result or traversal limit prevents a complete report. */
  truncated: boolean;
  /** Counts refer to the returned changes, including when truncated. */
  summary: Record<SpecDiffSeverity, number>;
};

const MAX_CHANGES = 500;
const MAX_SCHEMA_DEPTH = 16;
const MAX_VISITS = 20_000;
const METADATA = new Set(['title', 'description', 'example', 'examples', 'default', '$comment', 'deprecated', 'externalDocs', 'xml']);
const KNOWN_SCHEMA = new Set(['type', 'enum', 'required', 'properties', 'items', 'minimum', 'maximum', 'minItems', 'maxItems', 'minLength', 'maxLength', 'minProperties', 'maxProperties']);
const BOUNDS = ['minimum', 'maximum', 'minItems', 'maxItems', 'minLength', 'maxLength', 'minProperties', 'maxProperties'] as const;
const SCHEMA_MAPS = new Set(['properties', 'patternProperties', 'dependentSchemas', '$defs', 'definitions']);
const SCHEMA_CHILDREN = new Set(['items', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else', 'additionalProperties', 'unevaluatedProperties', 'unevaluatedItems', 'contains', 'propertyNames', 'contentSchema', 'prefixItems']);
const DETAILS: Record<SpecDiffCode, string> = {
  'operation-added': 'An operation was added.', 'operation-removed': 'An operation was removed.',
  'parameter-added': 'A request parameter was added.', 'parameter-removed': 'A request parameter was removed.',
  'parameter-location-changed': 'A request parameter moved to another location.',
  'parameter-required-changed': 'The requirement for a request parameter changed.',
  'parameter-serialization-changed': 'The serialization of a request parameter changed.',
  'request-body-added': 'A request body was added.', 'request-body-removed': 'A request body was removed.',
  'request-body-required-changed': 'The requirement for the request body changed.',
  'request-body-media-changed': 'The primary request media type changed.',
  'response-added': 'A response status was added.', 'response-removed': 'A response status was removed.',
  'response-media-changed': 'The primary response media type changed.',
  'schema-added': 'A schema constraint was added.', 'schema-removed': 'A schema constraint was removed.',
  'schema-boolean-changed': 'A boolean schema changed; compatibility needs manual review.',
  'schema-type-changed': 'The allowed JSON types changed.', 'schema-enum-changed': 'The set of allowed enum values changed.',
  'schema-required-changed': 'The set of required object fields changed.',
  'schema-property-added': 'An object field was added.', 'schema-property-removed': 'An object field was removed.',
  'schema-bound-changed': 'A numeric, string, array or object bound changed.',
  'schema-constraint-changed': 'An additional schema constraint changed; compatibility needs manual review.',
  'security-requirements-changed': 'The authentication alternatives or required scopes changed.',
  'security-scheme-changed': 'An authentication scheme used by this operation changed.',
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function strings(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))].sort() : []; }
function pointer(value: string): string { return value.replace(/~/g, '~0').replace(/\//g, '~1'); }
function key(operation: Operation): string { return `${operation.path}\u0000${operation.method}`; }
function subset<T>(left: T[], right: T[]): boolean { return left.every(item => right.includes(item)); }

/**
 * Compare the normalized OpenAPI 3.0/3.1 subset without network access or source mutation.
 * This is a review aid, not a complete JSON Schema or API compatibility certification.
 * Servers and documentation metadata are deliberately excluded.
 */
export function compareSpecs(before: NormalizedSpec, after: NormalizedSpec): SpecDiffReport {
  const report: SpecDiffReport = { changes: [], warnings: [], truncated: false, summary: { added: 0, removed: 0, 'potentially-breaking': 0, changed: 0 } };
  const warnings = new Set<string>();
  let visits = 0;
  const warnLimit = () => {
    report.truncated = true;
    warnings.add('Comparison reached a depth, cycle or work limit; some changes may be omitted.');
  };
  function visit(depth: number): boolean {
    if (depth > MAX_SCHEMA_DEPTH || ++visits > MAX_VISITS) { warnLimit(); return false; }
    return true;
  }
  function add(operation: Operation, location: string, code: SpecDiffCode, severity: SpecDiffSeverity, metadata: Pick<SpecDiffChange, 'beforeRequired' | 'afterRequired'> = {}): void {
    if (report.changes.length >= MAX_CHANGES) {
      report.truncated = true;
      warnings.add('The report is limited to 500 changes; additional changes are omitted.');
      return;
    }
    report.changes.push({ method: operation.method, path: operation.path, location, code, severity, detail: DETAILS[code], ...metadata });
  }

  // Fingerprints stay in memory and are never included in the report. They omit
  // editorial annotations but preserve literal enum objects and their properties.
  function fingerprint(value: unknown, schema = false, depth = 0, ancestors = new Set<object>(), schemaMap = false): string {
    if (!visit(depth)) return 'work-limit';
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
    if (ancestors.has(value)) { warnLimit(); return 'cycle'; }
    ancestors.add(value);
    let result: string;
    if (Array.isArray(value)) {
      result = `[${value.map(item => fingerprint(item, schema, depth + 1, ancestors)).join(',')}]`;
    } else {
      result = `{${Object.keys(value).sort().filter(name => !schema || schemaMap || !METADATA.has(name) && !name.startsWith('x-')).map(name => {
        const child = record(value)[name];
        let token: string;
        if (schemaMap) token = fingerprint(child, true, depth + 1, ancestors);
        else if (schema && (name === 'required' || name === 'type')) token = JSON.stringify(typeof child === 'string' ? [child] : strings(child));
        else if (schema && name === 'enum' && Array.isArray(child)) token = `[${[...new Set(child.map(item => fingerprint(item, false, depth + 1, ancestors)))].sort().join(',')}]`;
        else if (schema && SCHEMA_MAPS.has(name)) token = fingerprint(child, true, depth + 1, ancestors, true);
        else token = fingerprint(child, schema && SCHEMA_CHILDREN.has(name), depth + 1, ancestors);
        return `${JSON.stringify(name)}:${token}`;
      }).join(',')}}`;
    }
    ancestors.delete(value);
    return result;
  }

  function scanSchema(value: unknown, depth = 0, ancestors = new Set<object>()): void {
    if (value === undefined) return;
    if (!visit(depth)) return;
    if (typeof value === 'boolean') { warnings.add('Boolean schemas are compared conservatively and require manual review.'); return; }
    if (value === null || typeof value !== 'object') return;
    if (ancestors.has(value)) { warnLimit(); return; }
    ancestors.add(value);
    if (Array.isArray(value)) {
      for (const child of value) {
        if (visits > MAX_VISITS) { warnLimit(); break; }
        scanSchema(child, depth + 1, ancestors);
      }
      ancestors.delete(value);
      return;
    }
    const node = record(value);
    if (node.$ref !== undefined) warnings.add('Unresolved, external or cyclic references prevent a complete schema comparison.');
    for (const name of Object.keys(node)) {
      if (!KNOWN_SCHEMA.has(name) && !METADATA.has(name) && !name.startsWith('x-') && name !== '$ref') {
        warnings.add('Additional JSON Schema keywords are compared conservatively; their full semantics are not evaluated.');
      }
    }
    for (const name of SCHEMA_MAPS) {
      for (const child of Object.values(record(node[name]))) {
        if (visits > MAX_VISITS) { warnLimit(); break; }
        scanSchema(child, depth + 1, ancestors);
      }
    }
    for (const name of SCHEMA_CHILDREN) if (node[name] !== undefined) scanSchema(node[name], depth + 1, ancestors);
    ancestors.delete(value);
  }

  function types(value: unknown): string[] {
    const type = record(value).type;
    const values = typeof type === 'string' ? [type] : strings(type);
    return values.length ? values.sort() : ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'];
  }
  function typeSubset(left: string[], right: string[]): boolean {
    return left.every(type => right.includes(type) || type === 'integer' && right.includes('number'));
  }
  function enumValues(value: unknown): string[] | undefined {
    const values = record(value).enum;
    return Array.isArray(values) ? [...new Set(values.map(item => fingerprint(item)))].sort() : undefined;
  }
  function dangerous(narrower: boolean, wider: boolean, direction: 'request' | 'response'): SpecDiffSeverity {
    return (direction === 'request' ? narrower : wider) ? 'potentially-breaking' : 'changed';
  }
  function compareSchema(operation: Operation, left: unknown, right: unknown, location: string, direction: 'request' | 'response', depth = 0): void {
    if (!visit(depth)) return;
    if (left === undefined && right === undefined) return;
    if (left === undefined) { add(operation, location, 'schema-added', dangerous(true, false, direction)); return; }
    if (right === undefined) { add(operation, location, 'schema-removed', dangerous(false, true, direction)); return; }
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      if (fingerprint(left, true) !== fingerprint(right, true)) {
        const narrowing = right === false || left === true;
        const widening = left === false || right === true;
        add(operation, location, 'schema-boolean-changed', dangerous(narrowing, widening, direction));
      }
      return;
    }
    const oldNode = record(left), newNode = record(right);
    const oldTypes = types(left), newTypes = types(right);
    if (!typeSubset(oldTypes, newTypes) || !typeSubset(newTypes, oldTypes)) {
      add(operation, `${location}/type`, 'schema-type-changed', dangerous(!typeSubset(oldTypes, newTypes), !typeSubset(newTypes, oldTypes), direction));
    }
    const oldEnum = enumValues(left), newEnum = enumValues(right);
    if (JSON.stringify(oldEnum) !== JSON.stringify(newEnum)) {
      add(operation, `${location}/enum`, 'schema-enum-changed', dangerous(Boolean(newEnum && (!oldEnum || !subset(oldEnum, newEnum))), Boolean(oldEnum && (!newEnum || !subset(newEnum, oldEnum))), direction));
    }
    const oldRequired = strings(oldNode.required), newRequired = strings(newNode.required);
    for (const name of [...new Set([...oldRequired, ...newRequired])].sort()) {
      const beforeRequired = oldRequired.includes(name), afterRequired = newRequired.includes(name);
      if (beforeRequired === afterRequired) continue;
      add(operation, `${location}/required/${pointer(name)}`, 'schema-required-changed', dangerous(afterRequired, beforeRequired, direction), { beforeRequired, afterRequired });
    }
    for (const bound of BOUNDS) {
      if (oldNode[bound] === newNode[bound]) continue;
      const oldValue = typeof oldNode[bound] === 'number' ? oldNode[bound] as number : undefined;
      const newValue = typeof newNode[bound] === 'number' ? newNode[bound] as number : undefined;
      const minimum = bound === 'minimum' || bound.startsWith('min');
      const narrower = newValue !== undefined && (oldValue === undefined || (minimum ? newValue > oldValue : newValue < oldValue));
      const wider = oldValue !== undefined && (newValue === undefined || (minimum ? newValue < oldValue : newValue > oldValue));
      add(operation, `${location}/${bound}`, 'schema-bound-changed', dangerous(narrower, wider, direction));
    }
    const oldProperties = record(oldNode.properties), newProperties = record(newNode.properties);
    for (const name of [...new Set([...Object.keys(oldProperties), ...Object.keys(newProperties)])].sort()) {
      if (visits > MAX_VISITS) { warnLimit(); break; }
      const childLocation = `${location}/properties/${pointer(name)}`;
      if (!Object.hasOwn(oldProperties, name)) add(operation, childLocation, 'schema-property-added', direction === 'request' && newRequired.includes(name) ? 'potentially-breaking' : 'added');
      else if (!Object.hasOwn(newProperties, name)) add(operation, childLocation, 'schema-property-removed', 'potentially-breaking');
      else compareSchema(operation, oldProperties[name], newProperties[name], childLocation, direction, depth + 1);
    }
    if (oldNode.items !== undefined || newNode.items !== undefined) compareSchema(operation, oldNode.items, newNode.items, `${location}/items`, direction, depth + 1);
    const extra = (node: Record<string, unknown>) => Object.fromEntries(Object.entries(node).filter(([name]) => !KNOWN_SCHEMA.has(name) && !METADATA.has(name) && !name.startsWith('x-')));
    if (fingerprint(extra(oldNode), true) !== fingerprint(extra(newNode), true)) add(operation, location, 'schema-constraint-changed', 'potentially-breaking');
  }

  function schemaOf(value: { rawSchema?: unknown; schema?: unknown }): unknown { return value.schema ?? value.rawSchema; }
  function serialization(parameter: Parameter): string {
    const style = parameter.style ?? (parameter.in === 'query' || parameter.in === 'cookie' ? 'form' : 'simple');
    return `${style}:${parameter.explode ?? style === 'form'}`;
  }
  function compareParameters(operation: Operation, previous: Operation): void {
    const identity = (parameter: Parameter) => `${parameter.in}:${parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name}`;
    const oldParameters = new Map(previous.parameters.map(parameter => [identity(parameter), parameter]));
    const newParameters = new Map(operation.parameters.map(parameter => [identity(parameter), parameter]));
    const oldOnly = [...oldParameters.keys()].filter(name => !newParameters.has(name));
    const newOnly = [...newParameters.keys()].filter(name => !oldParameters.has(name));
    const moved = new Map<string, string>();
    for (const oldKey of oldOnly) {
      const oldParameter = oldParameters.get(oldKey)!;
      const candidates = newOnly.filter(newKey => newParameters.get(newKey)?.name === oldParameter.name);
      if (candidates.length === 1 && oldOnly.filter(name => oldParameters.get(name)?.name === oldParameter.name).length === 1) moved.set(oldKey, candidates[0]!);
    }
    const movedDestinations = new Set(moved.values());
    for (const name of [...new Set([...oldParameters.keys(), ...newParameters.keys()])].sort()) {
      if (movedDestinations.has(name)) continue;
      const oldParameter = oldParameters.get(name), newParameter = newParameters.get(moved.get(name) ?? name);
      const location = `/parameters/${pointer(name)}`;
      if (!oldParameter) { add(operation, location, 'parameter-added', newParameter?.required ? 'potentially-breaking' : 'added'); continue; }
      if (!newParameter) { add(operation, location, 'parameter-removed', 'potentially-breaking'); continue; }
      if (moved.has(name)) add(operation, location, 'parameter-location-changed', 'potentially-breaking');
      if (oldParameter.required !== newParameter.required) add(operation, location, 'parameter-required-changed', newParameter.required ? 'potentially-breaking' : 'changed');
      // Location changes already imply different serialization rules.
      if (!moved.has(name) && serialization(oldParameter) !== serialization(newParameter)) add(operation, location, 'parameter-serialization-changed', 'potentially-breaking');
      compareSchema(operation, schemaOf(oldParameter), schemaOf(newParameter), `${location}/schema`, 'request');
    }
  }
  function normalizedSecurity(security: SecurityRequirement[]): SecurityRequirement[] {
    const choices = security.length ? security : [{}];
    const unique = new Map<string, SecurityRequirement>();
    for (const choice of choices) {
      const normalized = Object.fromEntries(Object.keys(choice).sort().map(name => [name, strings(choice[name])]));
      unique.set(JSON.stringify(normalized), normalized);
    }
    const alternatives = [...unique.values()];
    // An easier OR alternative makes a stricter one redundant; {} permits public access.
    return alternatives.filter((choice, index) => !alternatives.some((other, otherIndex) => otherIndex !== index && covers(other, choice))).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  function covers(easier: SecurityRequirement, stricter: SecurityRequirement): boolean {
    return Object.keys(easier).every(name => Object.hasOwn(stricter, name) && subset(easier[name]!, stricter[name]!));
  }
  function compareSecurity(operation: Operation, previous: Operation): void {
    const oldSecurity = normalizedSecurity(previous.security), newSecurity = normalizedSecurity(operation.security);
    if (JSON.stringify(oldSecurity) !== JSON.stringify(newSecurity)) {
      const narrowed = oldSecurity.some(oldChoice => !newSecurity.some(newChoice => covers(newChoice, oldChoice)));
      add(operation, '/security', 'security-requirements-changed', narrowed ? 'potentially-breaking' : 'changed');
    }
    const used = new Set([...oldSecurity, ...newSecurity].flatMap(choice => Object.keys(choice)));
    for (const name of [...used].sort()) {
      const scheme = (op: Operation) => {
        const item = op.securitySchemes[name];
        return item ? { type: item.type, scheme: item.scheme?.toLowerCase(), in: item.in, name: item.in === 'header' ? item.name?.toLowerCase() : item.name } : undefined;
      };
      if (fingerprint(scheme(previous)) !== fingerprint(scheme(operation))) add(operation, `/securitySchemes/${pointer(name)}`, 'security-scheme-changed', 'potentially-breaking');
    }
  }
  function compareOperation(operation: Operation, previous: Operation): void {
    compareParameters(operation, previous);
    const oldBody = previous.requestBody, newBody = operation.requestBody;
    if (!oldBody && newBody) add(operation, '/requestBody', 'request-body-added', newBody.required ? 'potentially-breaking' : 'added');
    else if (oldBody && !newBody) add(operation, '/requestBody', 'request-body-removed', 'potentially-breaking');
    else if (oldBody && newBody) {
      if (oldBody.required !== newBody.required) add(operation, '/requestBody/required', 'request-body-required-changed', newBody.required ? 'potentially-breaking' : 'changed');
      if (oldBody.mediaType !== newBody.mediaType) add(operation, '/requestBody/mediaType', 'request-body-media-changed', 'potentially-breaking');
      compareSchema(operation, schemaOf(oldBody), schemaOf(newBody), '/requestBody/schema', 'request');
    }
    const oldResponses = new Map(previous.responses.map(response => [response.status, response]));
    const newResponses = new Map(operation.responses.map(response => [response.status, response]));
    for (const status of [...new Set([...oldResponses.keys(), ...newResponses.keys()])].sort()) {
      const oldResponse = oldResponses.get(status), newResponse = newResponses.get(status), location = `/responses/${pointer(status)}`;
      if (!oldResponse) add(operation, location, 'response-added', 'potentially-breaking');
      else if (!newResponse) add(operation, location, 'response-removed', 'potentially-breaking');
      else {
        if (oldResponse.contentType !== newResponse.contentType) add(operation, `${location}/contentType`, 'response-media-changed', 'potentially-breaking');
        compareSchema(operation, schemaOf(oldResponse), schemaOf(newResponse), `${location}/schema`, 'response');
      }
    }
    compareSecurity(operation, previous);
  }

  if (before.warnings.length || after.warnings.length) warnings.add('The imported documents contain normalization warnings; some OpenAPI features may not be represented.');
  const oldOperations = new Map(before.operations.map(operation => [key(operation), operation]));
  const newOperations = new Map(after.operations.map(operation => [key(operation), operation]));
  for (const operationKey of [...new Set([...oldOperations.keys(), ...newOperations.keys()])].sort()) {
    if (visits > MAX_VISITS) { warnLimit(); break; }
    const previous = oldOperations.get(operationKey), operation = newOperations.get(operationKey);
    for (const item of [previous, operation]) {
      if (!item) continue;
      if (item.unsupported.length || item.warnings.length) warnings.add('Some operations use unsupported or partially supported features; review the source documents.');
      for (const parameter of item.parameters) scanSchema(schemaOf(parameter));
      if (item.requestBody) scanSchema(schemaOf(item.requestBody));
      for (const response of item.responses) scanSchema(schemaOf(response));
    }
    if (!previous && operation) add(operation, '/', 'operation-added', 'added');
    else if (previous && !operation) add(previous, '/', 'operation-removed', 'removed');
    else if (previous && operation) compareOperation(operation, previous);
  }
  const order = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  report.changes.sort((left, right) => order(left.path, right.path) || order(left.method, right.method) || order(left.location, right.location) || order(left.code, right.code));
  for (const change of report.changes) report.summary[change.severity]++;
  report.warnings = [...warnings].sort();
  return report;
}
