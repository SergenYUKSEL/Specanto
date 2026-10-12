const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const MIN_REQUEST_TIMEOUT_MS = 100;
const MAX_REQUEST_TIMEOUT_MS = 300_000;

export function resolveRequestTimeout(value: unknown): number {
  if (value === undefined) return DEFAULT_REQUEST_TIMEOUT_MS;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < MIN_REQUEST_TIMEOUT_MS || value > MAX_REQUEST_TIMEOUT_MS) {
    throw new Error('requestTimeoutMs doit être un entier compris entre 100 et 300000 ms.');
  }
  return value;
}

export function describeRequestTimeout(timeoutMs: number, locale: 'fr' | 'en' = 'fr'): string {
  const seconds = timeoutMs / 1000;
  const duration = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', { maximumFractionDigits: 3, useGrouping: false }).format(seconds);
  return `${duration} ${locale === 'en' ? seconds === 1 ? 'second' : 'seconds' : seconds < 2 ? 'seconde' : 'secondes'}`;
}
