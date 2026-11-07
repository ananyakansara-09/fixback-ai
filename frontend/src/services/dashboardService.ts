import { apiClient } from '@/services/apiClient';
import type { DashboardPayload, SettingsPayload, SystemHealth } from '@/types/dashboard';

export const getDashboard = async (): Promise<DashboardPayload> => {
  const { data } = await apiClient.get<DashboardPayload>('/dashboard/stats');
  return data;
};

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const { data } = await apiClient.get<SystemHealth>('/health');
  return data;
};

export const getSettings = async (): Promise<SettingsPayload> => {
  const { data } = await apiClient.get<SettingsPayload>('/settings');
  return data;
};
