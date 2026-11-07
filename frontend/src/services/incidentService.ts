import {
  analyzeIncident as apiAnalyzeIncident,
  confirmIncident as apiConfirmIncident,
  getIncidentById as apiGetIncidentById,
  getIncidents as apiGetIncidents,
} from '@/api/incidentApi';
import type {
  ConfirmResolutionPayload,
  Incident,
  IncidentInput,
  IncidentQueryParams,
  IncidentResponse,
  PaginatedIncidentsData,
} from '@/types/incident';
import type { MemorySearchResult } from '@/types/memory';
import { parseMemoryItem } from '@/services/memoryService';

/**
 * Normalizes a backend IncidentResponse into the UI-compatible Incident model,
 * maintaining both snake_case backend fields and camelCase UI properties.
 */
export function normalizeIncident(inc: IncidentResponse): Incident {
  const diagnosis = inc.ai_diagnosis
    ? {
        summary: inc.ai_diagnosis.summary,
        possibleRootCause: inc.ai_diagnosis.possible_root_cause,
        confidence: 'high' as const,
        recommendations: inc.ai_diagnosis.recommended_steps ?? [],
        historicalContext: inc.ai_diagnosis.historical_context,
        memoryUsed: inc.ai_diagnosis.memory_used,
        relatedMemories: inc.ai_diagnosis.related_memories ?? [],
      }
    : null;

  const resolutionObj =
    inc.root_cause && inc.resolution
      ? {
          confirmedRootCause: inc.root_cause,
          verifiedResolution: inc.resolution,
          confirmedAt: inc.resolved_at ?? inc.updated_at,
        }
      : null;

  const recalledMemories: MemorySearchResult[] = Array.isArray(
    inc.ai_diagnosis?.related_memories
  )
    ? inc.ai_diagnosis.related_memories.map((raw: any) => parseMemoryItem(raw))
    : [];

  return {
    ...inc,
    logs: inc.logs ?? '',
    resolution: inc.resolution ?? null,
    errorMessage: inc.error_message,
    createdAt: inc.created_at,
    updatedAt: inc.updated_at,
    diagnosis,
    recalledMemories,
    resolutionObj,
  };
}

export interface ConfirmResolutionResult {
  incident: Incident;
  memoryRetained: boolean;
  retentionDetails?: Record<string, any> | null;
}

/**
 * List incidents from backend with optional filters and pagination.
 */
export async function listIncidents(params?: IncidentQueryParams): Promise<Incident[]> {
  const response = await apiGetIncidents(params);
  return (response.data.items ?? []).map(normalizeIncident);
}

/**
 * Fetch paginated incidents with metadata (total, pages, page).
 */
export async function getPaginatedIncidents(
  params?: IncidentQueryParams
): Promise<PaginatedIncidentsData & { incidents: Incident[] }> {
  const response = await apiGetIncidents(params);
  const data = response.data;
  return {
    ...data,
    incidents: (data.items ?? []).map(normalizeIncident),
  };
}

/**
 * Fetch single incident by UUID or incident_code.
 */
export async function getIncident(id: string): Promise<Incident> {
  const response = await apiGetIncidentById(id);
  return normalizeIncident(response.data);
}

/**
 * Submit an incident for analysis.
 * Sends error_message (snake_case) to FastAPI.
 */
export async function analyzeIncident(input: IncidentInput): Promise<Incident> {
  const response = await apiAnalyzeIncident({
    title: input.title,
    service: input.service,
    environment: input.environment,
    error_message: input.errorMessage,
    logs: input.logs || undefined,
  });

  const analyzeResult = response.data;
  const normalized = normalizeIncident(analyzeResult.incident);

  // If historical memories were returned in analyzeResult, attach them
  if (Array.isArray(analyzeResult.historical_memories) && analyzeResult.historical_memories.length > 0) {
    normalized.recalledMemories = analyzeResult.historical_memories.map((m) => parseMemoryItem(m));
  }

  return normalized;
}

/**
 * Confirm resolution and persist verified memory to Hindsight Cloud.
 */
export async function confirmResolution(
  id: string,
  payload: ConfirmResolutionPayload
): Promise<ConfirmResolutionResult> {
  const response = await apiConfirmIncident(id, {
    root_cause: payload.confirmedRootCause,
    resolution: payload.verifiedResolution,
  });

  const result = response.data;
  return {
    incident: normalizeIncident(result.incident),
    memoryRetained: result.memory_retained,
    retentionDetails: result.retention_details,
  };
}
