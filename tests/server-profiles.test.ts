import { describe, expect, test } from 'bun:test';
import { normalizeServerProfiles } from '../src/core/server-profiles';
import type { ServerProfile } from '../src/core/types';

describe('Server profile configuration', () => {
  test('keeps profiles optional and accepts an empty configuration', () => {
    expect(normalizeServerProfiles()).toEqual([]);
    expect(normalizeServerProfiles([])).toEqual([]);
  });

  test('resolves relative profiles against an explicit spec URL on local and deployed origins', () => {
    const profiles: ServerProfile[] = [
      { id: 'demo', label: 'Demo', url: '/api' },
      { id: 'preview', label: 'Preview', url: './preview?tenant=atelier' },
    ];
    expect(normalizeServerProfiles(profiles, 'http://localhost:3000/spec/openapi.json')).toEqual([
      { id: 'demo', label: 'Demo', url: 'http://localhost:3000/api' },
      { id: 'preview', label: 'Preview', url: 'http://localhost:3000/spec/preview?tenant=atelier' },
    ]);
    expect(normalizeServerProfiles(profiles, 'https://specanto.example.test/openapi.json')[0]?.url).toBe('https://specanto.example.test/api');
  });

  test('normalizes labels and URLs while preserving configured descriptions and queries', () => {
    expect(normalizeServerProfiles([
      { id: ' staging ', label: ' Staging ', url: ' HTTPS://STAGING.EXAMPLE.TEST:443/v1?tenant=atelier#ignored ', description: 'Read-only staging data' },
    ])).toEqual([
      { id: 'staging', label: 'Staging', url: 'https://staging.example.test/v1?tenant=atelier', description: 'Read-only staging data' },
    ]);
  });

  test('returns independent profiles without mutating frozen integrator configuration', () => {
    const profile = Object.freeze({ id: 'dev', label: 'Development', url: '/api', description: 'Local server' });
    const profiles = Object.freeze([profile]);
    const normalized = normalizeServerProfiles(profiles as unknown as ServerProfile[], 'https://docs.example.test/openapi.json');
    normalized[0]!.url = 'https://different.example.test/api';
    expect(profile.url).toBe('/api');
    expect(normalizeServerProfiles(profiles as unknown as ServerProfile[], 'https://other.example.test/spec.json')[0]?.url).toBe('https://other.example.test/api');
  });

  test('copies only profile fields rather than retaining credentials or request data', () => {
    const profile = { id: 'dev', label: 'Development', url: 'https://api.example.test', credentials: { Bearer: 'secret' }, parameterValues: { customer: 'alice' } };
    expect(normalizeServerProfiles([profile])).toEqual([{ id: 'dev', label: 'Development', url: 'https://api.example.test/' }]);
  });

  test('rejects relative destinations without an explicit valid HTTP base', () => {
    const profiles = [{ id: 'demo', label: 'Demo', url: '/api' }];
    expect(() => normalizeServerProfiles(profiles)).toThrow(/base|relative/i);
    expect(() => normalizeServerProfiles(profiles, 'invalid')).toThrow(/base|URL/i);
    expect(() => normalizeServerProfiles(profiles, 'file:///tmp/openapi.json')).toThrow(/HTTP/i);
    expect(() => normalizeServerProfiles(profiles, 'https://user:password@example.test/spec.json')).toThrow(/credential/i);
  });

  test('allows absolute destinations independently of an unused spec base', () => {
    expect(normalizeServerProfiles([{ id: 'prod', label: 'Production', url: 'https://api.example.test/v1' }], 'invalid')[0]?.url).toBe('https://api.example.test/v1');
  });

  test.each([
    'https://user:password@example.test/api',
    'https://user@example.test/api',
    '//user:password@example.test/api',
    'file:///tmp/api',
    'javascript:alert(1)',
    'https://{region}.example.test/api',
    'https://api.example.test/{version}',
    'https://',
  ])('rejects unsafe or unresolved destination %s', url => {
    expect(() => normalizeServerProfiles([{ id: 'dev', label: 'Development', url }], 'https://docs.example.test/spec.json')).toThrow(/credential|HTTP|variable|URL/i);
  });

  test('rejects the whole configuration when one profile is invalid', () => {
    expect(() => normalizeServerProfiles([
      { id: 'valid', label: 'Valid server', url: 'https://api.example.test' },
      { id: 'invalid', label: 'Invalid server', url: 'ftp://other.example.test' },
    ])).toThrow(/HTTP/i);
  });

  test('rejects sparse profile arrays rather than leaving an unchecked destination hole', () => {
    const profiles = new Array<ServerProfile>(2);
    profiles[0] = { id: 'dev', label: 'Development', url: 'https://api.example.test' };
    expect(() => normalizeServerProfiles(profiles)).toThrow(/profile|object/i);
  });

  test('rejects duplicate identities after surrounding whitespace is removed', () => {
    expect(() => normalizeServerProfiles([
      { id: 'dev', label: 'First server', url: 'https://first.example.test' },
      { id: ' dev ', label: 'Second server', url: 'https://second.example.test' },
    ])).toThrow(/duplicate|unique/i);
  });

  test.each([
    null,
    {},
    'profiles',
    [null],
    [[]],
    [{ id: '', label: 'Server', url: 'https://api.example.test' }],
    [{ id: 1, label: 'Server', url: 'https://api.example.test' }],
    [{ id: 'dev', label: '   ', url: 'https://api.example.test' }],
    [{ id: 'dev', label: 1, url: 'https://api.example.test' }],
    [{ id: 'dev', label: 'Server', url: '' }],
    [{ id: 'dev', label: 'Server', url: 1 }],
    [{ id: 'dev', label: 'Server', url: 'https://api.example.test', description: 1 }],
  ].map(value => ({ value })))('rejects malformed runtime configuration %#', ({ value }) => {
    expect(() => normalizeServerProfiles(value as unknown as ServerProfile[])).toThrow(/profile|configuration/i);
  });

  test('bounds the number and size of configured profiles', () => {
    const profiles = Array.from({ length: 20 }, (_, index) => ({ id: `server-${index}`, label: `Server ${index}`, url: 'https://api.example.test' }));
    expect(normalizeServerProfiles(profiles)).toHaveLength(20);
    expect(() => normalizeServerProfiles([...profiles, { id: 'extra', label: 'Extra', url: 'https://api.example.test' }])).toThrow(/20|limit|many/i);
    expect(() => normalizeServerProfiles([{ ...profiles[0]!, id: 'i'.repeat(81) }])).toThrow(/id|identity|80/i);
    expect(() => normalizeServerProfiles([{ ...profiles[0]!, label: 'l'.repeat(121) }])).toThrow(/label|120/i);
    expect(() => normalizeServerProfiles([{ ...profiles[0]!, description: 'd'.repeat(1001) }])).toThrow(/description|1.?000/i);
    expect(() => normalizeServerProfiles([{ ...profiles[0]!, url: `https://api.example.test/${'p'.repeat(2048)}` }])).toThrow(/URL|2.?048/i);
  });
});
