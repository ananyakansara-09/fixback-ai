import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { IncidentTable } from '@/components/IncidentTable';
import { LoadingState } from '@/components/LoadingState';
import { Pagination } from '@/components/Pagination';
import { getPaginatedIncidents } from '@/services/incidentService';
import { getErrorMessage } from '@/services/apiClient';
import type { Incident, IncidentStatus } from '@/types/incident';
import { ENVIRONMENT_LABELS } from '@/utils/format';

const PAGE_SIZE = 8;

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
  { value: 'resolved', label: 'Resolved' },
];

const KNOWN_SERVICES = [
  'payment-api',
  'auth-service',
  'checkout-web',
  'inventory-worker',
  'notification-service',
  'search-api',
];

interface Filters {
  query: string;
  status: string;
  environment: string;
  service: string;
}

export default function IncidentHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    query: searchParams.get('q') ?? '',
    status: '',
    environment: '',
    service: '',
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaginatedIncidents({
        page,
        limit: PAGE_SIZE,
        search: filters.query || undefined,
        status: filters.status || undefined,
        environment: filters.environment || undefined,
        service: filters.service || undefined,
      });

      setIncidents(data.incidents);
      setTotalCount(data.total);
      setPageCount(Math.max(1, data.total_pages));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const update = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    if (patch.query !== undefined) {
      setSearchParams(patch.query ? { q: patch.query } : {}, { replace: true });
    }
  };

  const hasActiveFilters = Object.entries(filters).some(([, value]) => value !== '');

  const clearFilters = () => {
    setFilters({ query: '', status: '', environment: '', service: '' });
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const inputClass =
    'rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-slate-100 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-edge bg-panel p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder="Search by title, code, service, or error"
              className={`${inputClass} w-full pl-9`}
            />
          </label>

          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by environment"
            value={filters.environment}
            onChange={(e) => update({ environment: e.target.value })}
            className={inputClass}
          >
            <option value="">All environments</option>
            {(Object.keys(ENVIRONMENT_LABELS) as (keyof typeof ENVIRONMENT_LABELS)[]).map((env) => (
              <option key={env} value={env}>
                {ENVIRONMENT_LABELS[env]}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by service"
            value={filters.service}
            onChange={(e) => update({ service: e.target.value })}
            className={inputClass}
          >
            <option value="">All services</option>
            {KNOWN_SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{totalCount} matching incidents (live from backend)</span>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200"
            >
              <X className="h-3 w-3" aria-hidden /> Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-edge bg-panel shadow-card">
        {loading ? (
          <LoadingState label="Loading incidents from backend..." />
        ) : error ? (
          <EmptyState
            tone="error"
            title="Couldn't load incidents"
            description={error}
            action={
              <button
                type="button"
                onClick={fetchIncidents}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-200 hover:bg-raised"
              >
                Retry
              </button>
            }
          />
        ) : incidents.length === 0 ? (
          <EmptyState
            title="No incidents match these filters"
            description="Try a different search term or clear filters to view recorded incidents."
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-200 hover:bg-raised"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <IncidentTable incidents={incidents} />
            <div className="border-t border-edge px-5 py-3">
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
