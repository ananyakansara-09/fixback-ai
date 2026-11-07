import { seedIncidents } from '@/data/seedIncidents';
import { seedMemories } from '@/data/seedMemories';
import { seedSettings, seedActivity } from '@/data/seedWorkspace';
import type {
  ActivityEvent,
  ActivityType,
  DailyIncidentActivity,
  DashboardPayload,
  SettingsPayload,
  SystemHealth,
} from '@/types/dashboard';
import type { ConfirmResolutionPayload, Incident, IncidentInput } from '@/types/incident';
import type { Memory, MemorySearchResult } from '@/types/memory';
import { buildDiagnosis, rankMemories, recallForIncident } from '@/services/mock/mockDiagnosis';

export class MockApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MockApiError';
    this.status = status;
  }
}

const db = {
  incidents: structuredClone(seedIncidents),
  memories: structuredClone(seedMemories),
  activity: structuredClone(seedActivity),
};

const nowIso = () => new Date().toISOString();

const nextId = (prefix: string, ids: string[], width: number) => {
  const max = ids.reduce((acc, id) => Math.max(acc, Number(id.split('-')[1])), 0);
  return `${prefix}-${String(max + 1).padStart(width, '0')}`;
};

const addActivity = (type: ActivityType, title: string, description: string, incidentId: string | null) => {
  const event: ActivityEvent = {
    id: nextId('ACT', db.activity.map((item) => item.id), 4),
    type,
    title,
    description,
    incidentId,
    at: nowIso(),
  };
  db.activity.unshift(event);
};

const findIncident = (id: string): Incident => {
  const incident = db.incidents.find((item) => item.id === id);
  if (!incident) throw new MockApiError(404, `Incident ${id} was not found.`);
  return incident;
};

export function listIncidents(): Incident[] {
  return [...db.incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getIncident(id: string): Incident {
  return findIncident(id);
}

export function analyzeIncident(input: IncidentInput): Incident {
  const recalled = recallForIncident(input, db.memories);
  const timestamp = nowIso();
  const incident: Incident = {
    ...input,
    id: nextId('INC', db.incidents.map((item) => item.id), 4),
    status: 'awaiting_confirmation',
    createdAt: timestamp,
    updatedAt: timestamp,
    diagnosis: buildDiagnosis(input, recalled),
    recalledMemories: recalled,
    resolution: null,
  };
  db.incidents.unshift(incident);

  addActivity('incident_submitted', 'Incident submitted', `${incident.id} reported from ${incident.service} in ${incident.environment}`, incident.id);
  if (recalled.length > 0) {
    addActivity(
      'memory_recalled',
      'Historical memory recalled',
      `${recalled.length} verified ${recalled.length === 1 ? 'memory matched' : 'memories matched'} ${incident.id}`,
      incident.id,
    );
  }
  addActivity('analysis_completed', 'AI analysis completed', `Hypotheses generated for ${incident.id}, awaiting engineer review`, incident.id);

  return incident;
}

export function confirmResolution(id: string, payload: ConfirmResolutionPayload): { incident: Incident; memory: Memory } {
  const incident = findIncident(id);
  if (incident.status === 'resolved') {
    throw new MockApiError(409, 'This incident already has a confirmed resolution.');
  }
  if (!payload.confirmedRootCause.trim() || !payload.verifiedResolution.trim()) {
    throw new MockApiError(422, 'Confirmed root cause and verified resolution are required.');
  }

  const timestamp = nowIso();
  incident.status = 'resolved';
  incident.updatedAt = timestamp;
  incident.resolution = {
    confirmedRootCause: payload.confirmedRootCause.trim(),
    verifiedResolution: payload.verifiedResolution.trim(),
    confirmedAt: timestamp,
  };

  const memory: Memory = {
    id: nextId('MEM', db.memories.map((item) => item.id), 4),
    sourceIncidentId: incident.id,
    service: incident.service,
    environment: incident.environment,
    historicalError: incident.errorMessage,
    confirmedRootCause: incident.resolution.confirmedRootCause,
    verifiedResolution: incident.resolution.verifiedResolution,
    type: 'incident_resolution',
    retainedAt: timestamp,
    recallCount: 0,
  };
  db.memories.unshift(memory);

  addActivity('root_cause_confirmed', 'Root cause confirmed', `Engineer verified the root cause of ${incident.id}`, incident.id);
  addActivity('memory_retained', 'Memory retained', `${memory.id} saved to engineering memory from ${incident.id}`, incident.id);

  return { incident: structuredClone(incident), memory };
}

export function searchMemories(query: string): MemorySearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...db.memories]
      .sort((a, b) => b.retainedAt.localeCompare(a.retainedAt))
      .map((memory) => ({ ...memory, matchScore: 0, matchReason: 'Retained engineering memory' }));
  }
  return rankMemories(trimmed, db.memories);
}

function incidentActivity(): DailyIncidentActivity[] {
  return Array.from({ length: 14 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - index));
    const key = day.toDateString();

    return {
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submitted: db.incidents.filter((item) => new Date(item.createdAt).toDateString() === key).length,
      resolved: db.incidents.filter((item) => item.resolution && new Date(item.resolution.confirmedAt).toDateString() === key).length,
    };
  });
}

export function getDashboard(): DashboardPayload {
  const incidents = listIncidents();
  const memories = [...db.memories].sort((a, b) => b.retainedAt.localeCompare(a.retainedAt));
  const activity = [...db.activity].sort((a, b) => b.at.localeCompare(a.at));

  return {
    stats: {
      totalIncidents: db.incidents.length,
      resolvedIncidents: db.incidents.filter((item) => item.status === 'resolved').length,
      pendingInvestigation: db.incidents.filter((item) => item.status !== 'resolved').length,
      memoriesStored: db.memories.length,
    },
    incidentActivity: incidentActivity(),
    recentIncidents: incidents.slice(0, 6),
    memory: {
      total: db.memories.length,
      lastUpdatedAt: memories[0]?.retainedAt ?? null,
      recent: memories.slice(0, 4),
      recentRecalls: activity.filter((item) => item.type === 'memory_recalled').slice(0, 4),
    },
    timeline: activity.slice(0, 8),
  };
}

export function getHealth(): SystemHealth {
  return {
    status: 'ok',
    checkedAt: nowIso(),
    connections: {
      backend: { name: 'FixBack API', state: 'connected', latencyMs: 42, detail: 'Responding normally' },
      hindsight: { name: 'Hindsight Memory', state: 'connected', latencyMs: 96, detail: `${db.memories.length} memories in namespace` },
      groq: { name: 'Groq AI', state: 'connected', latencyMs: 311, detail: `Model ${seedSettings.app.model} available` },
    },
  };
}

export function getSettings(): SettingsPayload {
  return seedSettings;
}
