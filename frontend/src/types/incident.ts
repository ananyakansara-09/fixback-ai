import type { MemorySearchResult } from '@/types/memory';

export type Environment = 'development' | 'staging' | 'production' | string;

export type IncidentStatus = 'analyzing' | 'awaiting_confirmation' | 'resolved';

export type DiagnosisConfidence = 'low' | 'medium' | 'high';

/** Standard wrapper returned by all FastAPI endpoints */
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Structured SRE diagnosis returned by backend (Groq + Hindsight) */
export interface AIDiagnosisSchema {
  summary: string;
  possible_root_cause: string;
  historical_context: string;
  recommended_steps: string[];
  memory_used: boolean;
  related_memories: any[];
}

/** Incident payload for POST /incidents/analyze */
export interface IncidentAnalyzeRequest {
  title: string;
  service: string;
  environment: string;
  error_message: string;
  logs?: string | null;
}

/** Payload for POST /incidents/{id}/confirm */
export interface IncidentConfirmRequest {
  root_cause: string;
  resolution: string;
}

/** Exact PostgreSQL Incident model response from backend */
export interface IncidentResponse {
  id: string; // UUID
  incident_code: string;
  title: string;
  service: string;
  environment: string;
  error_message: string;
  logs?: string | null;
  ai_diagnosis?: AIDiagnosisSchema | null;
  root_cause?: string | null;
  resolution?: string | null;
  status: IncidentStatus;
  memory_retained: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

/** Result returned by POST /incidents/analyze */
export interface IncidentAnalyzeResult {
  incident: IncidentResponse;
  diagnosis: AIDiagnosisSchema;
  historical_memories: any[];
  hindsight_status: {
    lookup_successful: boolean;
    memories_found: number;
    error?: string | null;
  };
}

/** Result returned by POST /incidents/{id}/confirm */
export interface IncidentConfirmResult {
  incident: IncidentResponse;
  memory_retained: boolean;
  retention_details?: Record<string, any> | null;
}

/** Result returned by GET /incidents */
export interface PaginatedIncidentsData {
  items: IncidentResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Query parameters for GET /incidents */
export interface IncidentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  service?: string;
  environment?: string;
  status?: string;
}

/* -------------------------------------------------------------
 * UI-Compatible Aliases and Extended Models
 * ----------------------------------------------------------- */

export interface IncidentInput {
  title: string;
  service: string;
  environment: Environment;
  errorMessage: string;
  logs: string;
}

export interface Diagnosis {
  summary: string;
  possibleRootCause: string;
  confidence: DiagnosisConfidence;
  recommendations: string[];
  historicalContext?: string;
  memoryUsed?: boolean;
  relatedMemories?: any[];
}

export interface Resolution {
  confirmedRootCause: string;
  verifiedResolution: string;
  confirmedAt: string;
}

export interface Incident extends IncidentInput {
  id: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  diagnosis: Diagnosis | null;
  recalledMemories: MemorySearchResult[];
  resolution: Resolution | string | null;

  // Real backend fields
  incident_code?: string;
  error_message?: string;
  ai_diagnosis?: AIDiagnosisSchema | null;
  root_cause?: string | null;
  memory_retained?: boolean;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  resolutionObj?: Resolution | null;
}

export interface ConfirmResolutionPayload {
  confirmedRootCause: string;
  verifiedResolution: string;
}
