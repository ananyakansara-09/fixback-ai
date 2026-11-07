import { apiClient } from '@/api/axios';
import type { APIResponse } from '@/types/incident';
import type { MemorySearchData } from '@/types/memory';

/**
 * Search retained engineering memories in Hindsight Cloud using semantic recall.
 * Calls GET /api/memory/search?q={query}&limit={limit}
 */
export async function searchMemories(
  query: string,
  limit: number = 10
): Promise<APIResponse<MemorySearchData>> {
  const response = await apiClient.get<APIResponse<MemorySearchData>>('/memory/search', {
    params: {
      q: query.trim(),
      limit,
    },
  });
  return response.data;
}

