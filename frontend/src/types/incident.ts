import type { MemorySearchResult } from '@/types/memory';

export type Environment = 'development' | 'staging' | 'production';

export type IncidentStatus = 'analyzing' | 'awaiting_confirmation' | 'resolved';

export type DiagnosisConfidence = 'low' | 'medium' | 'high';

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
  resolution: Resolution | null;
}

export interface ConfirmResolutionPayload {
  confirmedRootCause: string;
  verifiedResolution: string;
}
