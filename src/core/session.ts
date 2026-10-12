import type { HttpMethod, Operation, PreparedRequest, RequestResult } from './types';

export const HISTORY_LIMIT = 20;
export const FAVORITES_LIMIT = 100;

export type HistoryOutcome = 'response' | 'cancelled' | 'timeout' | 'network-error' | 'transport-error';
export type RequestSettlement =
  | { outcome: 'response'; result: Pick<RequestResult, 'status' | 'duration'> }
  | { outcome: Exclude<HistoryOutcome, 'response'>; duration: number };

/** Session metadata only. No submitted path values, queries, headers or bodies. */
export type HistoryEntry = {
  id: string;
  operationId: string;
  method: HttpMethod;
  path: string;
  origin: string | null;
  outcome: HistoryOutcome;
  status?: number;
  duration: number;
  timestamp: number;
};

let entrySequence = 0;

function safeOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

function safeDuration(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

function cloneMetadata(entry: HistoryEntry): HistoryEntry {
  return {
    id: entry.id,
    operationId: entry.operationId,
    method: entry.method,
    path: entry.path.split(/[?#]/, 1)[0] ?? '',
    origin: entry.origin === null ? null : safeOrigin(entry.origin),
    outcome: entry.outcome,
    ...(entry.outcome === 'response' && entry.status !== undefined ? { status: entry.status } : {}),
    duration: safeDuration(entry.duration),
    timestamp: entry.timestamp,
  };
}

/** Build a new entry after an explicit request settles, without retaining its objects. */
export function createHistoryEntry(
  operation: Pick<Operation, 'id' | 'method' | 'path'>,
  request: Pick<PreparedRequest, 'url'>,
  settlement: RequestSettlement,
): HistoryEntry {
  const timestamp = Date.now();
  return cloneMetadata({
    id: `request-${timestamp}-${++entrySequence}`,
    operationId: operation.id,
    method: operation.method,
    path: operation.path,
    origin: safeOrigin(request.url),
    outcome: settlement.outcome,
    ...(settlement.outcome === 'response' ? { status: settlement.result.status } : {}),
    duration: settlement.outcome === 'response' ? settlement.result.duration : settlement.duration,
    timestamp,
  });
}

/** Return a bounded, newest-first metadata list. All entries are copied explicitly. */
export function appendHistory(previous: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...previous].slice(0, HISTORY_LIMIT).map(cloneMetadata);
}

/** Keep only valid, unique operation IDs. Favorites never contain request values. */
export function toggleFavorite(
  previous: readonly string[],
  operationId: string,
  operations: readonly Pick<Operation, 'id'>[],
): string[] {
  const valid = new Set(operations.map(operation => operation.id));
  const normalized = [...new Set(previous)].filter(id => valid.has(id)).slice(0, FAVORITES_LIMIT);
  if (!valid.has(operationId)) return normalized;
  if (normalized.includes(operationId)) return normalized.filter(id => id !== operationId);
  return normalized.length < FAVORITES_LIMIT ? [...normalized, operationId] : normalized;
}
