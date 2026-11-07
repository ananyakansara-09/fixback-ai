import type { Incident } from '@/types/incident';
import type { Memory, MemorySearchResult } from '@/types/memory';
import { seedMemories } from '@/data/seedMemories';
import { hoursAgo } from '@/utils/time';

const memoryById = (id: string): Memory => {
  const memory = seedMemories.find((item) => item.id === id);
  if (!memory) throw new Error(`Seed memory ${id} is missing`);
  return memory;
};

const recall = (id: string, matchScore: number, matchReason: string): MemorySearchResult => ({
  ...memoryById(id),
  matchScore,
  matchReason,
});

export const seedIncidents: Incident[] = [
  {
    id: 'INC-1052',
    title: 'Checkout requests timing out during peak traffic',
    service: 'payment-api',
    environment: 'production',
    errorMessage: 'Database connection pool exhausted. Requests are timing out.',
    logs: `Service: payment-api
Environment: Production
2026-11-07T08:42:11Z WARN  pool.stats active=40 idle=0 waiting=128
2026-11-07T08:42:41Z ERROR Connection timeout after 30000ms
2026-11-07T08:42:41Z ERROR Database pool reached maximum connection limit (40)
2026-11-07T08:42:44Z INFO  reporting-job started by scheduler (pid 18822)`,
    status: 'awaiting_confirmation',
    createdAt: hoursAgo(2.5),
    updatedAt: hoursAgo(2.4),
    diagnosis: {
      summary:
        'The error pattern closely matches a previously resolved payment-api incident. Timeouts coincide with a pool that is fully saturated, which suggests connections are being held rather than released.',
      possibleRootCause:
        'Connections are held by long-running queries or idle transactions, leaving too few free connections for checkout requests.',
      confidence: 'high',
      recommendations: [
        'Inspect active and idle-in-transaction sessions in the database',
        'Compare the configured pool maximum against current request concurrency',
        'Identify queries that have been running longer than five seconds',
        'Check whether the scheduled reporting job started during the spike',
      ],
    },
    recalledMemories: [
      recall('MEM-0101', 0.92, 'Same service, identical pool timeout message, and matching saturation pattern'),
    ],
    resolution: null,
  },
  {
    id: 'INC-1051',
    title: 'Intermittent 401 responses after token refresh',
    service: 'auth-service',
    environment: 'production',
    errorMessage: 'Refresh token accepted but access token rejected with 401 Unauthorized.',
    logs: `2026-11-07T07:11:03Z INFO  token.refresh user=u_8831 pod=auth-7f9c
2026-11-07T07:11:03Z WARN  jwt.verify signature invalid kid=2026-10-a
2026-11-07T07:11:04Z INFO  token.refresh user=u_4410 pod=auth-5d2b`,
    status: 'analyzing',
    createdAt: hoursAgo(0.6),
    updatedAt: hoursAgo(0.6),
    diagnosis: null,
    recalledMemories: [],
    resolution: null,
  },
  {
    id: 'INC-1050',
    title: 'Stale JavaScript bundle served after release',
    service: 'checkout-web',
    environment: 'staging',
    errorMessage: 'ChunkLoadError: Loading chunk 214 failed after deployment.',
    logs: `GET /assets/checkout.8a31f.js 404
GET /index.html 200 cache-control=max-age=3600`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 1 + 3),
    updatedAt: hoursAgo(24 * 1 + 1),
    diagnosis: {
      summary: 'Asset hashes changed on deploy while clients still requested the previous build.',
      possibleRootCause: 'The HTML entry point is cached by the CDN and references chunks that no longer exist.',
      confidence: 'medium',
      recommendations: ['Confirm index.html cache headers', 'Purge CDN cache for the entry point'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'CDN cached index.html beyond the release, so clients loaded chunk hashes that were deleted.',
      verifiedResolution: 'Set no-cache on index.html, purged the CDN entry, and added a one-time reload on chunk load errors.',
      confirmedAt: hoursAgo(24 * 1 + 1),
    },
  },
  {
    id: 'INC-1049',
    title: 'Duplicate stock adjustments from queue consumers',
    service: 'inventory-worker',
    environment: 'production',
    errorMessage: 'Stock count decremented twice for order events after broker rebalance.',
    logs: `WARN  consumer.rebalance partitions=[3,7,11]
INFO  message.processed id=evt_77120 attempt=2`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 2 + 5),
    updatedAt: hoursAgo(24 * 2 + 2),
    diagnosis: {
      summary: 'Duplicate processing is consistent with at-least-once delivery during rebalances.',
      possibleRootCause: 'The consumer has no idempotency guard for redelivered messages.',
      confidence: 'high',
      recommendations: ['Check whether message IDs are persisted', 'Reproduce with a forced rebalance'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'Messages redelivered after rebalance were applied again because no processed-message record existed.',
      verifiedResolution: 'Added an idempotency table keyed by message ID with a unique constraint and reconciled affected SKUs.',
      confirmedAt: hoursAgo(24 * 2 + 2),
    },
  },
  {
    id: 'INC-1048',
    title: 'Transactional emails delayed by provider throttling',
    service: 'notification-service',
    environment: 'production',
    errorMessage: 'SES 454 Throttling: Maximum sending rate exceeded. Digest emails queued.',
    logs: `ERROR ses.send code=454 throttled=true queue_depth=18214
INFO  digest.job started batch=weekly-summary size=94000`,
    status: 'awaiting_confirmation',
    createdAt: hoursAgo(9),
    updatedAt: hoursAgo(8.8),
    diagnosis: {
      summary: 'Provider throttling started at the same time as a large digest batch. The batch likely exceeded the account send rate.',
      possibleRootCause: 'Digest jobs send faster than the provider quota allows, with no client-side rate limiting.',
      confidence: 'medium',
      recommendations: ['Check the account send rate quota', 'Pause the digest job until the queue drains'],
    },
    recalledMemories: [
      recall('MEM-0105', 0.84, 'Same provider error code and the same batch-job trigger'),
    ],
    resolution: null,
  },
  {
    id: 'INC-1047',
    title: 'Search latency spike and heap exhaustion during reindex',
    service: 'search-api',
    environment: 'staging',
    errorMessage: 'java.lang.OutOfMemoryError: Java heap space',
    logs: `INFO  reindex.start index=products batch=5000
ERROR bulk.request size=48MB
ERROR java.lang.OutOfMemoryError: Java heap space`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 4 + 2),
    updatedAt: hoursAgo(24 * 4),
    diagnosis: {
      summary: 'Heap exhaustion during bulk indexing usually points to oversized request batches.',
      possibleRootCause: 'Bulk requests exceed the memory budget of the indexing thread pool.',
      confidence: 'high',
      recommendations: ['Reduce the bulk batch size', 'Review heap settings'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'Reindex sent unbounded bulk requests of up to 48 MB.',
      verifiedResolution: 'Capped bulk batches at 500 documents and enabled backpressure on the indexer.',
      confirmedAt: hoursAgo(24 * 4),
    },
  },
  {
    id: 'INC-1046',
    title: 'Invoice generation ran twice after clock change',
    service: 'billing-jobs',
    environment: 'production',
    errorMessage: 'Duplicate invoices created for 1,204 subscriptions.',
    logs: `INFO  cron.fire job=invoice-monthly tz=America/New_York
INFO  cron.fire job=invoice-monthly tz=America/New_York`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 6 + 4),
    updatedAt: hoursAgo(24 * 6),
    diagnosis: {
      summary: 'Two identical cron firings within one hour suggest a scheduler time-zone issue.',
      possibleRootCause: 'The scheduler evaluates local time, so a daylight saving transition repeats an hour.',
      confidence: 'high',
      recommendations: ['Check scheduler time zone', 'Look for duplicate job runs'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'Scheduler used local time, so the repeated hour during the DST change fired the job twice.',
      verifiedResolution: 'Moved the schedule to UTC, added a distributed lock per job name, and voided duplicate invoices.',
      confirmedAt: hoursAgo(24 * 6),
    },
  },
  {
    id: 'INC-1045',
    title: 'Partner API TLS handshake failures',
    service: 'api-gateway',
    environment: 'production',
    errorMessage: 'x509: certificate has expired for partner.api.',
    logs: `ERROR tls.handshake partner=acme-retail err=x509: certificate has expired
WARN  cert.expiry days_remaining=-1`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 9 + 1),
    updatedAt: hoursAgo(24 * 9),
    diagnosis: {
      summary: 'Expired certificate on the partner-facing hostname.',
      possibleRootCause: 'Certificate renewal did not complete.',
      confidence: 'high',
      recommendations: ['Check certificate expiry', 'Renew the certificate'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'Automatic renewal was disabled during a manual migration and was never re-enabled.',
      verifiedResolution: 'Renewed the certificate, re-enabled automated renewal, and added a 30-day expiry alert.',
      confirmedAt: hoursAgo(24 * 9),
    },
  },
  {
    id: 'INC-1044',
    title: 'Payment webhook signature verification failing',
    service: 'payment-api',
    environment: 'staging',
    errorMessage: 'Webhook rejected: signature mismatch for event evt_test_9231.',
    logs: `WARN  webhook.verify signature mismatch
INFO  webhook.retry attempt=3`,
    status: 'awaiting_confirmation',
    createdAt: hoursAgo(24 * 1 + 10),
    updatedAt: hoursAgo(24 * 1 + 9),
    diagnosis: {
      summary: 'Signature mismatch on staging suggests a secret or raw-body mismatch rather than a payload change.',
      possibleRootCause: 'The webhook secret in staging does not match the endpoint, or the body was parsed before verification.',
      confidence: 'low',
      recommendations: ['Compare the endpoint secret with the staging configuration', 'Verify the raw request body is used'],
    },
    recalledMemories: [],
    resolution: null,
  },
  {
    id: 'INC-1043',
    title: 'Session store connections reset under load',
    service: 'auth-service',
    environment: 'development',
    errorMessage: 'ECONNRESET while reading session from redis.',
    logs: `ERROR redis.get ECONNRESET session:u_1192
INFO  redis.reconnect attempt=1`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 12),
    updatedAt: hoursAgo(24 * 11 + 20),
    diagnosis: {
      summary: 'Connection resets on a local Redis instance during load tests.',
      possibleRootCause: 'Client idle timeout is shorter than the pool keep-alive interval.',
      confidence: 'medium',
      recommendations: ['Check Redis timeout setting', 'Enable keep-alive on the client'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'Redis timeout was set to 60 seconds while the client kept idle sockets for 300 seconds.',
      verifiedResolution: 'Aligned client idle timeout below Redis timeout and enabled TCP keep-alive.',
      confirmedAt: hoursAgo(24 * 11 + 20),
    },
  },
  {
    id: 'INC-1042',
    title: 'Cart totals mismatch after currency switch',
    service: 'checkout-web',
    environment: 'production',
    errorMessage: 'Displayed total differs from charged amount for EUR customers.',
    logs: `WARN  pricing.round currency=EUR amount=19.995 mode=half-even
INFO  cart.total displayed=20.00 charged=19.99`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 13 + 3),
    updatedAt: hoursAgo(24 * 13),
    diagnosis: {
      summary: 'Rounding differs between the display layer and the payment layer.',
      possibleRootCause: 'Client and server use different rounding modes for currency conversion.',
      confidence: 'high',
      recommendations: ['Compare rounding rules in both services'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'The client rounded half-up while the server rounded half-even.',
      verifiedResolution: 'Standardized on server-side totals and removed client-side rounding for charges.',
      confirmedAt: hoursAgo(24 * 13),
    },
  },
  {
    id: 'INC-1041',
    title: 'Consumer lag increasing during reprocessing',
    service: 'inventory-worker',
    environment: 'development',
    errorMessage: 'Consumer lag exceeded 50,000 messages.',
    logs: `INFO  consumer.lag group=inventory partition=3 lag=51203`,
    status: 'resolved',
    createdAt: hoursAgo(24 * 13 + 12),
    updatedAt: hoursAgo(24 * 13 + 8),
    diagnosis: {
      summary: 'Lag growth during reprocessing is expected when batch size is too small.',
      possibleRootCause: 'Consumer batch size limits throughput below the producer rate.',
      confidence: 'medium',
      recommendations: ['Increase batch size', 'Scale consumer replicas'],
    },
    recalledMemories: [],
    resolution: {
      confirmedRootCause: 'Consumer prefetch was set to one message, limiting throughput.',
      verifiedResolution: 'Raised prefetch to 200 and processed batches in parallel per partition.',
      confirmedAt: hoursAgo(24 * 13 + 8),
    },
  },
];

