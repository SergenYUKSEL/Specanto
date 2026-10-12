import type { PreparedRequest } from './types';

function secretNames(request: PreparedRequest): Set<string> {
  return new Set(['authorization', ...request.secretHeaders.map(name => name.toLowerCase())]);
}

function headersForSnippet(request: PreparedRequest, includeSecrets: boolean): [string, string][] {
  const secrets = secretNames(request);
  return Object.entries(request.headers).map(([name, value]) => [
    name, !includeSecrets && secrets.has(name.toLowerCase()) ? '<redacted>' : value,
  ]);
}

function hasSecrets(request: PreparedRequest): boolean {
  return request.hasSecrets || request.secretHeaders.length > 0
    || Object.keys(request.headers).some(name => name.toLowerCase() === 'authorization');
}

function wellFormedBody(value: string): string {
  let normalized = '';
  // Iteration keeps valid surrogate pairs together; isolated UTF-16 units become U+FFFD as in Fetch.
  for (const character of value) {
    const unit = character.charCodeAt(0);
    normalized += character.length === 1 && unit >= 0xd800 && unit <= 0xdfff ? '\ufffd' : character;
  }
  return normalized;
}

/** Generate a Fetch example. Sensitive header values are redacted by default. */
export function toFetch(request: PreparedRequest, includeSecrets = false): string {
  // Pairs also preserve legal header names such as __proto__ without object-literal semantics.
  const headers = JSON.stringify(headersForSnippet(request, includeSecrets), null, 2).replace(/\n/g, '\n  ');
  const lines = [
    `const response = await fetch(${JSON.stringify(request.url)}, {`,
    `  method: ${JSON.stringify(request.method)},`,
    `  headers: ${headers},`,
  ];
  if (request.body !== undefined) lines.push(`  body: ${JSON.stringify(request.body)},`);
  lines.push(
    '  credentials: "omit",',
    `  redirect: "${hasSecrets(request) ? 'error' : 'follow'}",`,
    '  referrerPolicy: "no-referrer",',
    '  cache: "no-store",',
    '});',
    '',
    'console.log(response.status);',
    'console.log(await response.text());',
  );
  return lines.join('\n');
}

/** Generate a Python Requests example. Sensitive header values are redacted by default. */
export function toPython(request: PreparedRequest, includeSecrets = false): string {
  const headers = headersForSnippet(request, includeSecrets);
  const lines = [
    'import requests',
    '',
    'with requests.Session() as session:',
    '    session.trust_env = False',
    '    response = session.request(',
    `        method=${JSON.stringify(request.method)},`,
    `        url=${JSON.stringify(request.url)},`,
  ];
  if (headers.length) {
    lines.push('        headers={');
    for (const [name, value] of headers) lines.push(`            ${JSON.stringify(name)}: ${JSON.stringify(value)},`);
    lines.push('        },');
  } else lines.push('        headers={},');
  // Match the browser's UTF-8 body bytes; requests' json= argument would serialize the text a second time.
  if (request.body !== undefined) lines.push(`        data=${JSON.stringify(wellFormedBody(request.body))}.encode("utf-8"),`);
  lines.push(
    `        allow_redirects=${hasSecrets(request) ? 'False' : 'True'},`,
    '        timeout=45,',
    '    )',
    '    print(response.status_code)',
    '    print(response.text)',
  );
  return lines.join('\n');
}
