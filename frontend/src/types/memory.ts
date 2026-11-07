import type { Environment } from '@/types/incident';

export type MemoryType = 'incident_resolution' | 'runbook_note' | 'postmortem' | string;

/** Raw Hindsight memory object as returned by FastAPI GET /memory/search */
export interface MemoryItem {
  id?: string | null;
  content: string;
  memory_type?: string | null;
  metadata?: {
    incident_id?: string;
    incident_code?: string;
    service?: string;
    environment?: string;
    verification_status?: string;
    [key: string]: any;
  } | null;
  context?: string | null;
  tags?: string[] | null;
}

/** Data wrapper for GET /memory/search */
export interface MemorySearchData {
  query: string;
  count: number;
  memories: MemoryItem[];
}

/** UI Representation of a verified engineering memory */
export interface Memory {
  id: string;
  sourceIncidentId: string;
  service: string;
  environment: Environment;
  historicalError: string;
  confirmedRootCause: string;
  verifiedResolution: string;
  type: MemoryType;
  retainedAt: string;
  recallCount: number;
  content?: string;
  metadata?: Record<string, any> | null;
  tags?: string[] | null;
}

export interface MemorySearchResult extends Memory {
  matchScore: number;
  matchReason: string;
}
