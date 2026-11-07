import { apiClient } from '@/services/apiClient';
import type { ConfirmResolutionPayload, Incident, IncidentInput } from '@/types/incident';
import type { Memory } from '@/types/memory';

export interface ConfirmResolutionResult {
  incident: Incident;
  memory: Memory;
}

export const listIncidents = async (): Promise<Incident[]> => {
  const { data } = await apiClient.get<Incident[]>('/incidents');
  return data;
};

export const getIncident = async (id: string): Promise<Incident> => {
  const { data } = await apiClient.get<Incident>(`/incidents/${encodeURIComponent(id)}`);
  return data;
};

export const analyzeIncident = async (input: IncidentInput): Promise<Incident> => {
  const { data } = await apiClient.post<Incident>('/incidents/analyze', input);
  return data;
};

export const confirmResolution = async (id: string, payload: ConfirmResolutionPayload): Promise<ConfirmResolutionResult> => {
  const { data } = await apiClient.post<ConfirmResolutionResult>(`/incidents/${encodeURIComponent(id)}/confirm`, payload);
  return data;
};
