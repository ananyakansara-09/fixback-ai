import { apiClient } from '@/api/axios';
import type { APIResponse } from '@/types/incident';
import type { DashboardStatsData } from '@/types/dashboard';

/**
 * Fetch live dashboard metrics, incident counts, timeline, and recent activity.
 * Calls GET /api/dashboard/stats
 */
export async function getDashboardStats(): Promise<APIResponse<DashboardStatsData>> {
  const response = await apiClient.get<APIResponse<DashboardStatsData>>('/dashboard/stats');
  return response.data;
}

