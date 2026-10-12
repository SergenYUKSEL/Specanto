import { describe, expect, test } from 'bun:test';
import { describeRequestTimeout, resolveRequestTimeout } from '../src/ui/request-timeout';

describe('request timeout configuration', () => {
  test('keeps the default and accepts the documented boundaries', () => {
    expect(resolveRequestTimeout(undefined)).toBe(45_000);
    expect(resolveRequestTimeout(100)).toBe(100);
    expect(resolveRequestTimeout(300_000)).toBe(300_000);
  });

  test.each([0, -1, 99, 300_001, 100.5, NaN, Infinity, -Infinity, '1000', null])('rejects invalid runtime value %p', (value) => {
    expect(() => resolveRequestTimeout(value)).toThrow('requestTimeoutMs doit être un entier compris entre 100 et 300000 ms.');
  });

  test('describes the configured duration including milliseconds', () => {
    expect(describeRequestTimeout(45_000)).toBe('45 secondes');
    expect(describeRequestTimeout(1_000)).toBe('1 seconde');
    expect(describeRequestTimeout(100)).toBe('0,1 seconde');
    expect(describeRequestTimeout(1_234)).toBe('1,234 seconde');
    expect(describeRequestTimeout(300_000)).toBe('300 secondes');
  });
});
