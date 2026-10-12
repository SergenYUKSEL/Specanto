import { schemaTypes, validateSchema } from './schema';
import type { Operation, Parameter, PreparedRequest, RequestInput, Schema } from './types';

const FORBIDDEN_HEADERS = new Set(['accept-charset', 'accept-encoding', 'access-control-request-headers', 'access-control-request-method', 'connection', 'content-length', 'cookie', 'cookie2', 'date', 'dnt', 'expect', 'host', 'keep-alive', 'origin', 'permissions-policy', 'referer', 'set-cookie', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'via']);

function safeHeader(name: string, value: string): void {
  const lower = name.toLowerCase();
  if (!/^[!#$%&'*+.^_`|~\da-z-]+$/i.test(name) || /[\r\n\0]/.test(value)) throw new Error(`Invalid header: ${name}`);
  if (FORBIDDEN_HEADERS.has(lower) || lower.startsWith('proxy-') || lower.startsWith('sec-')) throw new Error(`Header ${name} is controlled by the browser and cannot be set.`);
  if (['x-http-method', 'x-http-method-override', 'x-method-override'].includes(lower) && /\b(CONNECT|TRACE|TRACK)\b/i.test(value)) throw new Error(`Forbidden method override header: ${name}`);
}

function scalar(raw: unknown, schema: Schema | undefined, label: string): string | number | boolean {
  const type = schemaTypes(schema).find(item => item !== 'null');
  let value: unknown = raw;
  if (type === 'number' || type === 'integer') {
    if (typeof raw !== 'number' && (typeof raw !== 'string' || !raw.trim())) throw new Error(`${label} must be ${type}.`);
    value = typeof raw === 'number' ? raw : Number(raw);
  } else if (type === 'boolean') {
    if (![true, false, 'true', 'false'].includes(raw as boolean | string)) throw new Error(`${label} must be boolean (true or false).`);
    value = raw === true || raw === 'true';
  }
  validateSchema(value, schema, label);
  if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error(`Unsupported scalar parameter: ${label}`);
  return value as string | number | boolean;
}

function arrayValues(raw: string, parameter: Parameter): (string | number | boolean)[] {
  let values: unknown;
  if (raw.trim().startsWith('[')) {
    try { values = JSON.parse(raw); } catch { throw new Error(`${parameter.name} must be a JSON array or comma-separated values.`); }
  } else {
    values = raw.split(',').map(item => item.trim());
  }
  if (!Array.isArray(values)) throw new Error(`${parameter.name} must be an array.`);
  const result = values.map(value => scalar(value, parameter.schema?.items, parameter.name));
  validateSchema(result, parameter.schema, parameter.name);
  return result;
}

function destination(serverUrl: string, baseUrl?: string): URL {
  if (!serverUrl.trim() || /[{}]/.test(serverUrl)) throw new Error('A valid server URL with resolved variables is required.');
  const absolute = /^[a-z][a-z\d+.-]*:/i.test(serverUrl);
  if (!absolute && !baseUrl) throw new Error('A relative server URL requires an explicit base URL.');
  let url: URL;
  try { url = absolute ? new URL(serverUrl) : new URL(serverUrl, baseUrl); } catch { throw new Error('Invalid server URL or base URL.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS destinations are supported.');
  if (url.username || url.password) throw new Error('Credentials in server URLs are not allowed.');
  url.hash = '';
  return url;
}

function encodePath(value: string): string {
  if (value === '.' || value === '..') throw new Error('Dot segments are not supported as path parameter values.');
  return encodeURIComponent(value).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function buildRequest(operation: Operation, input: RequestInput): PreparedRequest {
  if (operation.unsupported.length) throw new Error(`Unsupported request: ${operation.unsupported.join(' ')}`);
  if (operation.method === 'TRACE') throw new Error('Unsupported browser request method: TRACE.');
  const url = destination(input.serverUrl, input.baseUrl);
  const headers: Record<string, string> = {};
  const headerNames = new Set<string>();
  const secretHeaders: string[] = [];
  const addHeader = (name: string, value: string, secret = false) => {
    safeHeader(name, value);
    if (headerNames.has(name.toLowerCase())) throw new Error(`Duplicate header collision: ${name}`);
    headerNames.add(name.toLowerCase());
    Object.defineProperty(headers, name, { value, enumerable: true, writable: true, configurable: true });
    if (secret || name.toLowerCase() === 'authorization') secretHeaders.push(name);
  };
  let path = operation.path;
  for (const parameter of operation.parameters) {
    if (!parameter.supported) throw new Error(`Unsupported parameter serialization: ${parameter.in}:${parameter.name}`);
    const raw = input.parameterValues[`${parameter.in}:${parameter.name}`];
    if (raw === undefined || raw === '') {
      if (parameter.required) throw new Error(`Required parameter ${parameter.name} is missing.`);
      continue;
    }
    if (parameter.in === 'query' && schemaTypes(parameter.schema).includes('array')) {
      const values = arrayValues(raw, parameter);
      if (parameter.explode !== false) values.forEach(value => url.searchParams.append(parameter.name, String(value)));
      else url.searchParams.append(parameter.name, values.join(','));
      continue;
    }
    const value = String(scalar(raw, parameter.schema, parameter.name));
    if (parameter.in === 'path') path = path.split(`{${parameter.name}}`).join(encodePath(value));
    else if (parameter.in === 'query') url.searchParams.append(parameter.name, value);
    else if (parameter.in === 'header') addHeader(parameter.name, value);
    else throw new Error(`Unsupported parameter location: ${parameter.in}`);
  }
  if (/[{}]/.test(path)) throw new Error('A required path parameter is unresolved.');
  // Keep the server prefix: new URL(operation.path, server) would discard it.
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  let body: string | undefined;
  if (operation.requestBody) {
    if (!operation.requestBody.supported) throw new Error('Unsupported request body serialization.');
    if (!input.body?.trim()) {
      if (operation.requestBody.required) throw new Error('A JSON request body is required.');
    } else {
      let parsed: unknown;
      try { parsed = JSON.parse(input.body); } catch { throw new Error('The request body must contain valid JSON.'); }
      validateSchema(parsed, operation.requestBody.schema, 'body');
      if (operation.method === 'GET' || operation.method === 'HEAD') throw new Error('GET and HEAD requests cannot contain a body in the browser.');
      body = input.body;
      addHeader('Content-Type', operation.requestBody.mediaType);
    }
  }
  if (operation.security.length) {
    const choice = input.authAlternative ?? 0;
    if (!Number.isInteger(choice) || !operation.security[choice]) throw new Error('The selected security alternative does not exist.');
    for (const name of Object.keys(operation.security[choice])) {
      const scheme = operation.securitySchemes[name];
      if (!scheme?.supported) throw new Error(`Unsupported authentication scheme: ${name}`);
      const credential = input.credentials[name];
      if (!credential?.trim()) throw new Error(`Required credential ${name} is missing.`);
      if (input.credentialOrigins[name] !== url.origin) throw new Error(`Credential ${name} is not bound to the final destination origin ${url.origin}.`);
      if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer') addHeader('Authorization', `Bearer ${credential}`, true);
      else if (scheme.type === 'apiKey' && scheme.in === 'header' && scheme.name) addHeader(scheme.name, credential, true);
      else throw new Error(`Unsupported authentication scheme: ${name}`);
    }
  }
  return { url: url.href, method: operation.method, headers, body, hasSecrets: secretHeaders.length > 0, secretHeaders };
}

function shellQuote(value: string): string { return `'${value.replace(/'/g, "'\\''")}'`; }

export function toCurl(request: PreparedRequest, includeSecrets = false): string {
  const secretNames = new Set(request.secretHeaders.map(name => name.toLowerCase()));
  const parts = ['curl', '-X', shellQuote(request.method), shellQuote(request.url)];
  for (const [name, originalValue] of Object.entries(request.headers)) {
    const value = !includeSecrets && secretNames.has(name.toLowerCase()) ? '<redacted>' : originalValue;
    parts.push('-H', shellQuote(`${name}: ${value}`));
  }
  if (request.body !== undefined) parts.push('--data-raw', shellQuote(request.body));
  return parts.join(' ');
}
