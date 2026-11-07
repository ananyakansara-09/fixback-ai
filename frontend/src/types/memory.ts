import type { Environment } from '@/types/incident';

export type MemoryType = 'incident_resolution' | 'runbook_note' | 'postmortem';

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
}

export interface MemorySearchResult extends Memory {
  matchScore: number;
  matchReason: string;
}
