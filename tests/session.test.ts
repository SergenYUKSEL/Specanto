import { describe, expect, test } from 'bun:test';
import { appendHistory, createHistoryEntry, HISTORY_LIMIT, toggleFavorite } from '../src/core/session';
import type { Operation, PreparedRequest, RequestResult } from '../src/core/types';

function operation(id = 'getProduct'): Operation {
  return { id, method: 'GET', path: '/products/{id}', summary: 'Private example', description: 'Private documentation', tags: [], parameters: [], responses: [], security: [], securitySchemes: {}, servers: [], warnings: [], unsupported: [] };
}

function request(): PreparedRequest {
  return { url: 'https://username:userinfo-secret@api.example.test:8443/products/private-path-secret?api_key=query-secret#fragment-secret', method: 'GET', headers: { Authorization: 'Bearer header-secret', 'X-Customer': 'private-header' }, body: 'body-secret', hasSecrets: true, secretHeaders: ['Authorization'] };
}

function result(): RequestResult {
  return { status: 401, statusText: 'response-status-secret', duration: 12.7, headers: { 'Set-Cookie': 'response-header-secret' }, body: 'response-body-secret' };
}

describe('memory-only request history metadata', () => {
  test('records template, origin and response metadata, without request or response content', () => {
    const entry = createHistoryEntry(operation(), request(), { outcome: 'response', result: result() });
    expect(entry).toEqual({ id: expect.any(String), operationId: 'getProduct', method: 'GET', path: '/products/{id}', origin: 'https://api.example.test:8443', outcome: 'response', status: 401, duration: 13, timestamp: expect.any(Number) });
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toMatch(/secret|username|private-header|Private example|Private documentation/);
    expect(Object.keys(entry).sort()).toEqual(['duration', 'id', 'method', 'operationId', 'origin', 'outcome', 'path', 'status', 'timestamp']);
  });

  test('records classified failures without retaining raw errors or invented statuses', () => {
    for (const outcome of ['cancelled', 'timeout', 'network-error', 'transport-error'] as const) {
      const entry = createHistoryEntry(operation(), request(), { outcome, duration: 25 });
      expect(entry.outcome).toBe(outcome);
      expect(entry.duration).toBe(25);
      expect(entry.status).toBeUndefined();
      expect(JSON.stringify(entry)).not.toContain('secret');
    }
  });

  test('does not expose query or fragment strings from authored path templates', () => {
    const entry = createHistoryEntry({ ...operation(), path: '/products/{id}?key=template-secret#fragment-secret' }, request(), { outcome: 'response', result: result() });
    expect(entry.path).toBe('/products/{id}');
    expect(JSON.stringify(entry)).not.toContain('template-secret');
  });

  test('does not record opaque, invalid or unsupported server origins', () => {
    for (const url of ['not-a-url', '/relative/path?key=secret', 'data:text/plain,secret', 'file:///private/secret']) {
      const entry = createHistoryEntry(operation(), { ...request(), url }, { outcome: 'response', result: result() });
      expect(entry.origin).toBeNull();
      expect(JSON.stringify(entry)).not.toContain('secret');
    }
  });

  test('normalizes invalid elapsed times and assigns distinct identifiers', () => {
    for (const duration of [-1, Infinity, NaN]) {
      expect(createHistoryEntry(operation(), request(), { outcome: 'network-error', duration }).duration).toBe(0);
    }
    const first = createHistoryEntry(operation(), request(), { outcome: 'network-error', duration: 1 });
    const second = createHistoryEntry(operation(), request(), { outcome: 'network-error', duration: 1 });
    expect(first.id).not.toBe(second.id);
  });

  test('keeps only the latest 20 entries, newest first, without mutating the input', () => {
    const originals = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) => createHistoryEntry(operation(String(index)), request(), { outcome: 'response', result: result() }));
    const previous = originals.slice();
    const entry = createHistoryEntry(operation('latest'), request(), { outcome: 'response', result: result() });
    const appended = appendHistory(previous, entry);
    expect(appended).toHaveLength(20);
    expect(appended[0]?.operationId).toBe('latest');
    expect(appended[1]?.operationId).toBe('0');
    expect(previous).toEqual(originals);
    expect(appended[0]).not.toBe(entry);
    expect(appended[1]).not.toBe(previous[0]);
  });

  test('append strips surplus properties instead of copying request-shaped metadata', () => {
    const entry = createHistoryEntry(operation(), request(), { outcome: 'response', result: result() });
    const withExtraFields = { ...entry, request: request(), error: 'error-secret' };
    expect(JSON.stringify(appendHistory([withExtraFields], withExtraFields))).not.toContain('secret');
    expect(Object.keys(appendHistory([], withExtraFields)[0]!).sort()).toEqual(Object.keys(entry).sort());
  });
});

describe('session favorites', () => {
  test('toggles only existing operation IDs and never mutates the input', () => {
    const operations = [operation('a'), operation('b')];
    const previous = ['a'];
    expect(toggleFavorite(previous, 'b', operations)).toEqual(['a', 'b']);
    expect(previous).toEqual(['a']);
    expect(toggleFavorite(previous, 'a', operations)).toEqual([]);
    expect(toggleFavorite(previous, 'unknown', operations)).toEqual(['a']);
  });

  test('deduplicates favorites, removes invalid IDs and preserves valid insertion order', () => {
    expect(toggleFavorite(['b', 'invalid', 'a', 'b'], 'c', [operation('a'), operation('b'), operation('c')])).toEqual(['b', 'a', 'c']);
    expect(toggleFavorite(['b', 'invalid', 'a', 'b'], 'b', [operation('a'), operation('b')])).toEqual(['a']);
  });

  test('caps the number of favorites at 100 while still allowing removal', () => {
    const operations = Array.from({ length: 101 }, (_, index) => operation(String(index)));
    const previous = operations.slice(0, 100).map(item => item.id);
    expect(toggleFavorite(previous, '100', operations)).toEqual(previous);
    expect(toggleFavorite(previous, '0', operations)).toHaveLength(99);
  });
});
