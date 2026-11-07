import type { Incident, IncidentResponse } from '@/types/incident';
import type { Memory } from '@/types/memory';

/* -------------------------------------------------------------
 * Backend Schema Matching Types
 * ----------------------------------------------------------- */

export interface IncidentOverTimeItem {
  date: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  incident_code: string;
  title: string;
  service: string;
  action: string;
  timestamp: string;
  details?: string | null;
}

export interface DashboardStatsData {
  total_incidents: number;
  resolved_incidents: number;
  pending_incidents: number;
  analyzing_incidents: number;
  successfully_retained_memories: number;
  incidents_by_status: Record<string, number>;
  incidents_over_time: IncidentOverTimeItem[];
  recent_incidents: IncidentResponse[];
  recent_activity: ActivityItem[];
}

export interface BackendHealthData {
  status: 'healthy' | 'degraded';
  database: {
    connected: boolean;
    message: string;
  };
  hindsight: {
    configured: boolean;
    ready: boolean;
    bank_id: string;
    message: string;
  };
  groq: {
    configured: boolean;
    ready: boolean;
    model?: string;
    message: string;
  };
}

/* -------------------------------------------------------------
 * UI Types & Frontend View Models
 * ----------------------------------------------------------- */

export type ActivityType =
  | 'incident_submitted'
  | 'analysis_completed'
  | 'memory_recalled'
  | 'root_cause_confirmed'
  | 'memory_retained';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  incidentId: string | null;
  at: string;
}

export interface DailyIncidentActivity {
  date: string;
  submitted: number;
  resolved: number;
}

export interface DashboardStats {
  totalIncidents: number;
  resolvedIncidents: number;
  pendingInvestigation: number;
  memoriesStored: number;
  analyzingIncidents?: number;
}

export interface DashboardPayload {
  stats: DashboardStats;
  incidentActivity: DailyIncidentActivity[];
  recentIncidents: Incident[];
  memory: {
    total: number;
    lastUpdatedAt: string | null;
    recent: Memory[];
    recentRecalls: ActivityEvent[];
  };
  timeline: ActivityEvent[];
}

export type ConnectionState = 'connected' | 'degraded' | 'disconnected';

export interface ServiceConnection {
  name: string;
  state: ConnectionState;
  latencyMs: number | null;
  detail: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  checkedAt: string;
  connections: {
    backend: ServiceConnection;
    database?: ServiceConnection;
    hindsight: ServiceConnection;
    groq: ServiceConnection;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface SettingsPayload {
  team: {
    name: string;
    slug: string;
    plan: string;
    members: TeamMember[];
  };
  user: {
    name: string;
    role: string;
    email: string;
    initials: string;
  };
  app: {
    version: string;
    environment: string;
    apiBaseUrl: string;
    memoryNamespace: string;
    model: string;
  };
}
