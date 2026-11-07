import { apiClient } from '@/api/axios';
import type { APIResponse } from '@/types/incident';
import type { BackendHealthData } from '@/types/dashboard';

/**
 * Check backend system health, database status, Hindsight readiness, and Groq configuration.
 * Calls GET /api/health
 */
export async function getHealth(): Promise<APIResponse<BackendHealthData>> {
  const response = await apiClient.get<APIResponse<BackendHealthData>>('/health');
  return response.data;
}

