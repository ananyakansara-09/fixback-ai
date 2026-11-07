import type { Diagnosis, IncidentInput } from '@/types/incident';
import type { Memory, MemorySearchResult } from '@/types/memory';

const RELEVANCE_THRESHOLD = 0.35;
const SAME_SERVICE_BONUS = 0.2;

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'after', 'during', 'into', 'that', 'this',
  'was', 'were', 'are', 'not', 'has', 'have', 'been', 'its', 'over', 'out', 'under',
]);

const tokenize = (text: string): string[] => [
  ...new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  ),
];

const memoryText = (memory: Memory) =>
  `${memory.service} ${memory.historicalError} ${memory.confirmedRootCause} ${memory.verifiedResolution}`;

export function rankMemories(queryText: string, memories: Memory[], service?: string): MemorySearchResult[] {
  const terms = tokenize(queryText);
  if (terms.length === 0) return [];

  return memories
    .flatMap((memory): MemorySearchResult[] => {
      const haystack = new Set(tokenize(memoryText(memory)));
      const sharedTerms = terms.filter((term) => haystack.has(term));
      if (sharedTerms.length === 0) return [];

      const sameService = service !== undefined && memory.service === service;
      const score = sharedTerms.length / terms.length + (sameService ? SAME_SERVICE_BONUS : 0);
      const reasons = [
        `Shared terms: ${sharedTerms.slice(0, 4).join(', ')}`,
        sameService ? `Same service (${memory.service})` : null,
      ].filter(Boolean);

      return [
        {
          ...memory,
          matchScore: Math.min(0.98, Number(score.toFixed(2))),
          matchReason: reasons.join('; '),
        },
      ];
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function recallForIncident(input: IncidentInput, memories: Memory[]): MemorySearchResult[] {
  return rankMemories(`${input.title} ${input.errorMessage}`, memories, input.service)
    .filter((result) => result.matchScore >= RELEVANCE_THRESHOLD)
    .slice(0, 3);
}

const confidenceFromScore = (score: number): Diagnosis['confidence'] => {
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
};

export function buildDiagnosis(input: IncidentInput, recalled: MemorySearchResult[]): Diagnosis {
  const [best] = recalled;
  if (best) {
    return {
      summary: `This error resembles verified incident ${best.sourceIncidentId} in ${best.service}. The earlier pattern is a hypothesis for this incident until an engineer confirms it.`,
      possibleRootCause: `Possibly the same failure as before: ${best.confirmedRootCause}`,
      confidence: confidenceFromScore(best.matchScore),
      recommendations: [
        `Check whether the previous fix still applies: ${best.verifiedResolution}`,
        'Compare the current logs with the historical error pattern',
        'Confirm recent deployments and configuration changes for this service',
      ],
    };
  }

  const text = `${input.title} ${input.errorMessage} ${input.logs}`.toLowerCase();
  const rule = HEURISTIC_RULES.find((candidate) => candidate.pattern.test(text)) ?? DEFAULT_RULE;

  return {
    summary:
      'No verified memory matches this error yet. This hypothesis is based on general patterns in the message and logs and has not been checked against your systems.',
    possibleRootCause: rule.rootCause,
    confidence: 'low',
    recommendations: rule.recommendations,
  };
}

const HEURISTIC_RULES: { pattern: RegExp; rootCause: string; recommendations: string[] }[] = [
  {
    pattern: /timeout|timed out|pool|saturat|exhaust/,
    rootCause: 'A downstream dependency or shared resource is saturated, so requests wait until they time out.',
    recommendations: [
      'Check connection or thread pool utilization for the service',
      'Look for slow queries or calls to downstream dependencies',
      'Compare traffic volume with the time the errors started',
    ],
  },
  {
    pattern: /memory|heap|oom/,
    rootCause: 'Memory pressure from oversized work units or a leak in the service process.',
    recommendations: ['Review memory usage trends before the failure', 'Check batch or payload sizes', 'Capture a heap profile if the issue recurs'],
  },
  {
    pattern: /certificate|tls|x509|ssl/,
    rootCause: 'A certificate or TLS configuration is invalid, expired, or not trusted by the caller.',
    recommendations: ['Check certificate expiry dates and the chain', 'Confirm which hostname the caller uses', 'Review recent certificate or proxy changes'],
  },
  {
    pattern: /401|403|unauthori|forbidden|token|jwt|signature/,
    rootCause: 'Credentials, signing keys, or token validation are out of sync between services.',
    recommendations: ['Compare signing key IDs across instances', 'Check token expiry and clock skew', 'Review recent auth configuration changes'],
  },
  {
    pattern: /throttl|rate limit|429/,
    rootCause: 'A provider or internal rate limit was exceeded by a burst of requests.',
    recommendations: ['Check the current quota for the provider', 'Identify the job or client producing the burst', 'Add client-side rate limiting or backoff'],
  },
];

const DEFAULT_RULE = {
  rootCause: 'A recent change or unexpected input is causing the failing request path to error.',
  recommendations: [
    'Check recent deployments for the affected service',
    'Review error rate and latency for the last hour',
    'Capture the first full stack trace from the logs',
  ],
};
