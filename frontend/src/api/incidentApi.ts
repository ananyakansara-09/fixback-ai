import { apiClient } from '@/api/axios';
import type {
  APIResponse,
  IncidentAnalyzeRequest,
  IncidentAnalyzeResult,
  IncidentConfirmRequest,
  IncidentConfirmResult,
  IncidentQueryParams,
  IncidentResponse,
  PaginatedIncidentsData,
} from '@/types/incident';

/**
 * Submit an engineering incident to the backend for AI diagnosis and Hindsight memory retrieval.
 * Calls POST /api/incidents/analyze
 */
export async function analyzeIncident(
  data: IncidentAnalyzeRequest
): Promise<APIResponse<IncidentAnalyzeResult>> {
  const response = await apiClient.post<APIResponse<IncidentAnalyzeResult>>(
    '/incidents/analyze',
    data
  );
  return response.data;
}

/**
 * Fetch a paginated list of incidents with optional search and filters.
 * Calls GET /api/incidents
 */
export async function getIncidents(
  params?: IncidentQueryParams
): Promise<APIResponse<PaginatedIncidentsData>> {
  const queryParams: Record<string, any> = {};

  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params?.service && params.service.trim()) queryParams.service = params.service.trim();
  if (params?.environment && params.environment.trim()) queryParams.environment = params.environment.trim();
  if (params?.status && params.status.trim()) queryParams.status = params.status.trim();

  const response = await apiClient.get<APIResponse<PaginatedIncidentsData>>('/incidents', {
    params: queryParams,
  });
  return response.data;
}

/**
 * Retrieve a single incident by its ID (UUID) or incident_code (INC-...).
 * Calls GET /api/incidents/{id}
 */
export async function getIncidentById(
  id: string
): Promise<APIResponse<IncidentResponse>> {
  const response = await apiClient.get<APIResponse<IncidentResponse>>(
    `/incidents/${encodeURIComponent(id)}`
  );
  return response.data;
}

/**
 * Confirm a developer-verified root cause and resolution.
 * Updates PostgreSQL and retains the verified resolution in Hindsight Cloud.
 * Calls POST /api/incidents/{id}/confirm
 */
export async function confirmIncident(
  id: string,
  data: IncidentConfirmRequest
): Promise<APIResponse<IncidentConfirmResult>> {
  const response = await apiClient.post<APIResponse<IncidentConfirmResult>>(
    `/incidents/${encodeURIComponent(id)}/confirm`,
    data
  );
  return response.data;
}

