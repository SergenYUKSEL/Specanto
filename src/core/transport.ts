import { parseSpec, SPEC_BYTE_LIMIT } from './parser';
import type { NormalizedSpec, PreparedRequest, RequestResult } from './types';

const RESPONSE_BYTE_LIMIT = 100 * 1024;

export class TransportError extends Error {
  readonly kind: 'network' | 'abort' | 'response';
  constructor(kind: 'network' | 'abort' | 'response', message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'TransportError';
    this.kind = kind;
  }
}

async function boundedText(response: Response, limit: number, rejectOverflow: boolean): Promise<{ text: string; truncated: boolean }> {
  const length = Number(response.headers.get('content-length'));
  if (rejectOverflow && Number.isFinite(length) && length > limit) {
    await response.body?.cancel();
    throw new Error('The specification is too large (2 MiB limit).');
  }
  if (!response.body) return { text: '', truncated: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let size = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = limit - size;
      if (value.byteLength > remaining) {
        await reader.cancel();
        if (rejectOverflow) throw new Error('The specification is too large (2 MiB limit).');
        chunks.push(decoder.decode(value.subarray(0, remaining), { stream: true }));
        truncated = true;
        break;
      }
      size += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return { text: chunks.join(''), truncated };
  } finally { reader.releaseLock(); }
}

function importUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value, typeof location === 'undefined' ? undefined : location.href); }
  catch { throw new Error('An absolute HTTP URL is required outside a browser.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Specifications must be loaded from an HTTP or HTTPS URL.');
  if (url.username || url.password) throw new Error('Credentials in specification URLs are not allowed.');
  return url;
}

export async function loadSpec(url: string, signal?: AbortSignal): Promise<NormalizedSpec> {
  const source = importUrl(url);
  const response = await fetch(source, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Could not load the OpenAPI document: HTTP ${response.status}.`);
  }
  const content = await boundedText(response, SPEC_BYTE_LIMIT, true);
  return parseSpec(content.text, response.url || source.href);
}

export async function httpTransport(request: PreparedRequest, signal?: AbortSignal): Promise<RequestResult> {
  const start = performance.now();
  let phase: 'network' | 'response' = 'network';
  try {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    const hasSecrets = request.hasSecrets || request.secretHeaders.length > 0 || Object.keys(request.headers).some(name => name.toLowerCase() === 'authorization');
    const response = await fetch(request.url, {
      method: request.method, headers: request.headers, body: request.body, signal,
      credentials: 'omit', redirect: hasSecrets ? 'error' : 'follow', referrerPolicy: 'no-referrer', cache: 'no-store',
    });
    phase = 'response';
    const content = await boundedText(response, RESPONSE_BYTE_LIMIT, false);
    return {
      status: response.status, statusText: response.statusText, duration: Math.round(performance.now() - start),
      headers: Object.fromEntries(response.headers.entries()), body: content.text, truncated: content.truncated,
    };
  } catch (cause) {
    const aborted = signal?.aborted || cause instanceof Error && cause.name === 'AbortError';
    if (aborted) throw new TransportError('abort', 'The request was cancelled.', cause);
    throw new TransportError(phase, phase === 'network' ? 'Network, CORS or credentialed redirect prevented the request.' : 'The response stream could not be read.', cause);
  }
}
