import { apiClient } from '@/services/apiClient';
import type { MemorySearchResult } from '@/types/memory';

export const searchMemories = async (query: string): Promise<MemorySearchResult[]> => {
  const { data } = await apiClient.get<MemorySearchResult[]>('/memory/search', { params: { q: query } });
  return data;
};
