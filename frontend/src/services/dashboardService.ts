import { getDashboardStats } from '@/api/dashboardApi';
import { getHealth } from '@/api/healthApi';
import type {
  ActivityEvent,
  ActivityType,
  DailyIncidentActivity,
  DashboardPayload,
  DashboardStats,
  SettingsPayload,
  SystemHealth,
} from '@/types/dashboard';
import type { Incident } from '@/types/incident';
import type { Memory } from '@/types/memory';
import { normalizeIncident } from '@/services/incidentService';
import { parseMemoryItem } from '@/services/memoryService';

/**
 * Fetch and construct the comprehensive dashboard payload from live FastAPI backend stats.
 */
export async function getDashboard(): Promise<DashboardPayload> {
  const response = await getDashboardStats();
  const data = response.data;

  // 1. Map stats
  const stats: DashboardStats = {
    totalIncidents: data.total_incidents,
    resolvedIncidents: data.resolved_incidents,
    pendingInvestigation: data.pending_incidents + data.analyzing_incidents,
    memoriesStored: data.successfully_retained_memories,
    analyzingIncidents: data.analyzing_incidents,
  };

  // 2. Map incident activity over time
  const incidentActivity: DailyIncidentActivity[] = (data.incidents_over_time ?? []).map(
    (item) => ({
      date: item.date,
      submitted: item.count,
      resolved: 0,
    })
  );

  // If backend returned fewer than 3 dates, pad nicely with recent days so the area chart renders smoothly
  if (incidentActivity.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    incidentActivity.push({ date: today, submitted: data.total_incidents, resolved: data.resolved_incidents });
  }

  // 3. Map recent incidents
  const recentIncidents: Incident[] = (data.recent_incidents ?? []).map(normalizeIncident);

  // 4. Map recent activity items to ActivityEvent
  const timeline: ActivityEvent[] = (data.recent_activity ?? []).map((item) => {
    let type: ActivityType = 'incident_submitted';
    const actionLower = (item.action || '').toLowerCase();

    if (actionLower.includes('resolution') || actionLower.includes('retained')) {
      type = 'root_cause_confirmed';
    } else if (actionLower.includes('analyzed')) {
      type = 'analysis_completed';
    } else if (actionLower.includes('recalled')) {
      type = 'memory_recalled';
    }

    return {
      id: item.id,
      type,
      title: item.action || 'Incident Event',
      description: `${item.incident_code} · ${item.title}${item.details ? `: ${item.details}` : ''}`,
      incidentId: item.incident_code,
      at: item.timestamp,
    };
  });

  // 5. Memory activity section
  const retainedIncidents = recentIncidents.filter((inc) => inc.memory_retained || inc.status === 'resolved');
  const recentMemories: Memory[] = retainedIncidents.map((inc) =>
    parseMemoryItem({
      id: `MEM-${inc.incident_code}`,
      content: `Observed error: ${inc.error_message}\nConfirmed root cause: ${inc.root_cause ?? 'Resolved'}\nVerified resolution: ${inc.resolution ?? 'Verified'}`,
      metadata: {
        incident_code: inc.incident_code,
        service: inc.service,
        environment: inc.environment,
        retained_at: inc.resolved_at ?? inc.updated_at,
      },
    })
  );

  const memoryTimeline = timeline.filter(
    (e) => e.type === 'root_cause_confirmed' || e.type === 'memory_recalled' || e.type === 'memory_retained'
  );

  const lastUpdatedAt: string | null =
    retainedIncidents.length > 0
      ? (retainedIncidents[0].resolved_at ?? retainedIncidents[0].updated_at ?? null)
      : null;

  return {
    stats,
    incidentActivity,
    recentIncidents,
    memory: {
      total: data.successfully_retained_memories,
      lastUpdatedAt,
      recent: recentMemories,
      recentRecalls: memoryTimeline,
    },
    timeline,
  };
}

/**
 * Check live backend, database, Hindsight, and Groq health via GET /api/health.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const startTime = Date.now();
  try {
    const response = await getHealth();
    const latency = Date.now() - startTime;
    const data = response.data;

    const isHealthy = data.status === 'healthy';
    const dbOk = Boolean(data.database?.connected);
    const hindsightReady = Boolean(data.hindsight?.ready);
    const hindsightConfigured = Boolean(data.hindsight?.configured);
    const groqReady = Boolean(data.groq?.ready);
    const groqConfigured = Boolean(data.groq?.configured);

    return {
      status: isHealthy ? 'ok' : 'degraded',
      checkedAt: new Date().toISOString(),
      connections: {
        backend: {
          name: 'FastAPI Backend',
          state: 'connected',
          latencyMs: latency,
          detail: `Operational (${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'})`,
        },
        database: {
          name: 'PostgreSQL Database',
          state: dbOk ? 'connected' : 'disconnected',
          latencyMs: null,
          detail: data.database?.message || (dbOk ? 'Connected to database' : 'Database connection unavailable'),
        },
        hindsight: {
          name: 'Hindsight Memory Bank',
          state: hindsightReady ? 'connected' : hindsightConfigured ? 'degraded' : 'disconnected',
          latencyMs: null,
          detail: data.hindsight?.message || `Bank: ${data.hindsight?.bank_id}`,
        },
        groq: {
          name: 'Groq SRE Intelligence',
          state: groqReady ? 'connected' : groqConfigured ? 'degraded' : 'disconnected',
          latencyMs: null,
          detail: data.groq?.message || `Model: ${data.groq?.model}`,
        },
      },
    };
  } catch (error: any) {
    return {
      status: 'degraded',
      checkedAt: new Date().toISOString(),
      connections: {
        backend: {
          name: 'FastAPI Backend',
          state: 'disconnected',
          latencyMs: null,
          detail: 'Unable to reach backend server on http://localhost:8000',
        },
        database: {
          name: 'PostgreSQL Database',
          state: 'disconnected',
          latencyMs: null,
          detail: 'Status unavailable (backend offline)',
        },
        hindsight: {
          name: 'Hindsight Memory Bank',
          state: 'disconnected',
          latencyMs: null,
          detail: 'Status unavailable (backend offline)',
        },
        groq: {
          name: 'Groq SRE Intelligence',
          state: 'disconnected',
          latencyMs: null,
          detail: 'Status unavailable (backend offline)',
        },
      },
    };
  }
}

/**
 * Return application settings and engineering team metadata.
 */
export async function getSettings(): Promise<SettingsPayload> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api';

  return {
    team: {
      name: 'Platform Reliability',
      slug: 'platform-reliability',
      plan: 'Engineering Team',
      members: [
        { id: 'u_01', name: 'Maya Chen', role: 'Staff SRE', initials: 'MC' },
        { id: 'u_02', name: 'Daniel Okafor', role: 'Backend Engineer', initials: 'DO' },
        { id: 'u_03', name: 'Priya Raman', role: 'Payments Engineer', initials: 'PR' },
        { id: 'u_04', name: 'Lucas Ferreira', role: 'Platform Engineer', initials: 'LF' },
        { id: 'u_05', name: 'Hana Sato', role: 'Security Engineer', initials: 'HS' },
      ],
    },
    user: {
      name: 'Maya Chen',
      role: 'Staff SRE',
      email: 'maya.chen@fixback.internal',
      initials: 'MC',
    },
    app: {
      version: '1.0.0',
      environment: 'Development',
      apiBaseUrl: baseUrl,
      memoryNamespace: 'fixback-engineering',
      model: 'openai/gpt-oss-120b',
    },
  };
}
