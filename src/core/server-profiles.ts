import type { ServerProfile } from './types';

function requiredText(value: unknown, field: string, limit: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Server profile ${field} must be a non-empty string.`);
  if (value.length > limit) throw new Error(`Server profile ${field} exceeds the ${limit} character limit.`);
  return value.trim();
}

function profileUrl(value: string, baseUrl?: string): string {
  if (/[{}]/.test(value)) throw new Error('Server profile URL variables must be resolved.');
  const absolute = /^[a-z][a-z\d+.-]*:/i.test(value);
  if (!absolute && !baseUrl) throw new Error('A relative server profile URL requires an explicit base URL.');
  let url: URL;
  try { url = absolute ? new URL(value) : new URL(value, baseUrl); }
  catch { throw new Error('Invalid server profile URL or base URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Server profile destinations must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Credentials in server profile URLs are not allowed.');
  url.hash = '';
  return url.href;
}

/** Resolve integrator-supplied destinations without changing the OpenAPI document or issuing requests. */
export function normalizeServerProfiles(profiles?: ServerProfile[], baseUrl?: string): ServerProfile[] {
  if (profiles === undefined) return [];
  if (!Array.isArray(profiles)) throw new Error('Server profile configuration must be an array.');
  if (profiles.length > 20) throw new Error('Server profile configuration is limited to 20 profiles.');
  const identities = new Set<string>();
  return Array.from(profiles).map(profile => {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('Each server profile must be an object.');
    const id = requiredText(profile.id, 'id', 80);
    const label = requiredText(profile.label, 'label', 120);
    const url = requiredText(profile.url, 'URL', 2048);
    if (identities.has(id)) throw new Error(`Duplicate server profile id: ${id}`);
    identities.add(id);
    const result: ServerProfile = { id, label, url: profileUrl(url, baseUrl) };
    if (profile.description !== undefined) {
      if (typeof profile.description !== 'string' || profile.description.length > 1000) throw new Error('Server profile description must be a string of at most 1000 characters.');
      result.description = profile.description;
    }
    return result;
  });
}
