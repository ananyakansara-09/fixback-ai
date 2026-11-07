import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
  MockApiError,
  analyzeIncident,
  confirmResolution,
  getDashboard,
  getHealth,
  getIncident,
  getSettings,
  listIncidents,
  searchMemories,
} from '@/services/mock/mockDb';
import type { ConfirmResolutionPayload, IncidentInput } from '@/types/incident';

interface RouteContext {
  match: RegExpMatchArray;
  query: Record<string, unknown>;
  body: unknown;
}

interface MockRoute {
  method: 'GET' | 'POST';
  pattern: RegExp;
  latencyMs: number;
  handler: (context: RouteContext) => unknown;
}

const DEFAULT_LATENCY_MS = 450;
const ANALYSIS_LATENCY_MS = 2000;

const isIncidentInput = (body: unknown): body is IncidentInput => {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.service === 'string' &&
    typeof candidate.errorMessage === 'string' &&
    typeof candidate.logs === 'string' &&
    ['development', 'staging', 'production'].includes(String(candidate.environment))
  );
};

const isConfirmPayload = (body: unknown): body is ConfirmResolutionPayload => {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.confirmedRootCause === 'string' && typeof candidate.verifiedResolution === 'string';
};

const ROUTES: MockRoute[] = [
  { method: 'GET', pattern: /^\/health$/, latencyMs: 200, handler: () => getHealth() },
  { method: 'GET', pattern: /^\/settings$/, latencyMs: DEFAULT_LATENCY_MS, handler: () => getSettings() },
  { method: 'GET', pattern: /^\/dashboard\/stats$/, latencyMs: DEFAULT_LATENCY_MS, handler: () => getDashboard() },
  {
    method: 'POST',
    pattern: /^\/incidents\/analyze$/,
    latencyMs: ANALYSIS_LATENCY_MS,
    handler: ({ body }) => {
      if (!isIncidentInput(body)) throw new MockApiError(422, 'Incident details are incomplete or invalid.');
      return analyzeIncident(body);
    },
  },
  { method: 'GET', pattern: /^\/incidents$/, latencyMs: DEFAULT_LATENCY_MS, handler: () => listIncidents() },
  { method: 'GET', pattern: /^\/incidents\/([^/]+)$/, latencyMs: DEFAULT_LATENCY_MS, handler: ({ match }) => getIncident(match[1]) },
  {
    method: 'POST',
    pattern: /^\/incidents\/([^/]+)\/confirm$/,
    latencyMs: DEFAULT_LATENCY_MS,
    handler: ({ match, body }) => {
      if (!isConfirmPayload(body)) throw new MockApiError(422, 'Confirmed root cause and verified resolution are required.');
      return confirmResolution(match[1], body);
    },
  },
  {
    method: 'GET',
    pattern: /^\/memory\/search$/,
    latencyMs: DEFAULT_LATENCY_MS,
    handler: ({ query }) => searchMemories(String(query.q ?? '')),
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildResponse = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config,
  request: {},
});

const parseBody = (data: unknown): unknown => (typeof data === 'string' && data.length > 0 ? JSON.parse(data) : data);

export const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toUpperCase();
  const path = (config.url ?? '').split('?')[0];
  const route = ROUTES.find((candidate) => candidate.method === method && candidate.pattern.test(path));

  if (!route) {
    throw new AxiosError(`No mock route for ${method} ${path}`, 'ERR_BAD_REQUEST', config, undefined, buildResponse(config, 404, { message: 'Endpoint not found.' }));
  }

  await delay(route.latencyMs);

  const match = path.match(route.pattern);
  if (!match) throw new AxiosError('Route mismatch', 'ERR_BAD_REQUEST', config);

  try {
    const data = route.handler({
      match,
      query: (config.params as Record<string, unknown>) ?? {},
      body: parseBody(config.data),
    });
    return buildResponse(config, 200, structuredClone(data));
  } catch (error) {
    if (error instanceof MockApiError) {
      const response = buildResponse(config, error.status, { message: error.message });
      throw new AxiosError(error.message, 'ERR_BAD_REQUEST', config, undefined, response);
    }
    throw error;
  }
};
