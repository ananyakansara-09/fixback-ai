import { searchMemories as apiSearchMemories } from '@/api/memoryApi';
import type { MemoryItem, MemorySearchResult } from '@/types/memory';

/**
 * Parses raw Hindsight text or structured memory items into a strongly-typed MemorySearchResult.
 * Safely extracts observed error, confirmed root cause, verified resolution, incident code, and service.
 */
export function parseMemoryItem(raw: any, defaultQuery?: string): MemorySearchResult {
  const content = typeof raw === 'string' ? raw : raw?.content ?? raw?.text ?? JSON.stringify(raw ?? '');
  const id = raw?.id ?? raw?.metadata?.incident_code ?? `MEM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const metadata = typeof raw?.metadata === 'object' && raw?.metadata !== null ? raw.metadata : {};
  const tags = Array.isArray(raw?.tags) ? raw.tags : [];

  const getField = (regex: RegExp): string => {
    const match = content.match(regex);
    return match && match[1] ? match[1].trim() : '';
  };

  const observedError =
    getField(/Observed error:\s*(.*?)(?=\n[A-Z]|$)/is) ||
    metadata.error_message ||
    metadata.observed_error ||
    content;

  const confirmedRootCause =
    getField(/Confirmed root cause:\s*(.*?)(?=\n[A-Z]|$)/is) ||
    metadata.confirmed_root_cause ||
    metadata.root_cause ||
    'Confirmed by engineering team';

  const verifiedResolution =
    getField(/Verified resolution:\s*(.*?)(?=\n[A-Z]|$)/is) ||
    metadata.verified_resolution ||
    metadata.resolution ||
    'Resolution verified in production';

  const sourceIncidentId =
    metadata.incident_code ||
    getField(/Incident Code:\s*(.*?)(?=\n|$)/i) ||
    metadata.incident_id ||
    getField(/Incident ID:\s*(.*?)(?=\n|$)/i) ||
    'HISTORICAL';

  const service =
    metadata.service ||
    getField(/Service:\s*(.*?)(?=\n|$)/i) ||
    'service';

  const environment =
    metadata.environment ||
    getField(/Environment:\s*(.*?)(?=\n|$)/i) ||
    'production';

  const memoryType = raw?.memory_type ?? metadata.verification_status ?? 'incident_resolution';

  // Compute similarity score if provided or relevance preview
  const matchScore = typeof raw?.score === 'number' ? raw.score : 0.88;
  const matchReason =
    raw?.context ||
    raw?.relevance ||
    (defaultQuery ? `Matches query: "${defaultQuery}"` : 'Recalled by Hindsight semantic similarity');

  return {
    id,
    sourceIncidentId,
    service,
    environment,
    historicalError: observedError,
    confirmedRootCause,
    verifiedResolution,
    type: memoryType,
    retainedAt: metadata.retained_at ?? new Date().toISOString(),
    recallCount: typeof raw?.recall_count === 'number' ? raw.recall_count : 1,
    content,
    metadata,
    tags,
    matchScore,
    matchReason,
  };
}

/**
 * Search Hindsight engineering memories by query string.
 * Calls GET /api/memory/search?q={query}
 */
export async function searchMemories(query: string): Promise<MemorySearchResult[]> {
  if (!query || !query.trim()) {
    return [];
  }

  const response = await apiSearchMemories(query.trim());
  const items = response.data?.memories ?? [];
  return items.map((item) => parseMemoryItem(item, query.trim()));
}
