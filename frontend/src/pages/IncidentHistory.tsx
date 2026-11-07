import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { IncidentTable } from '@/components/IncidentTable';
import { LoadingState } from '@/components/LoadingState';
import { Pagination } from '@/components/Pagination';
import { useAsync } from '@/hooks/useAsync';
import { listIncidents } from '@/services/incidentService';
import type { Incident, IncidentStatus } from '@/types/incident';
import { ENVIRONMENT_LABELS } from '@/utils/format';

const PAGE_SIZE = 8;

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
  { value: 'resolved', label: 'Resolved' },
];

interface Filters {
  query: string;
  status: string;
  environment: string;
  service: string;
  from: string;
  to: string;
}

const startOfDay = (value: string) => new Date(`${value}T00:00:00`).getTime();
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999`).getTime();

function filterIncidents(incidents: Incident[], filters: Filters): Incident[] {
  const query = filters.query.trim().toLowerCase();
  return incidents.filter((incident) => {
    if (query && ![incident.title, incident.id, incident.service].some((field) => field.toLowerCase().includes(query))) return false;
    if (filters.status && incident.status !== filters.status) return false;
    if (filters.environment && incident.environment !== filters.environment) return false;
    if (filters.service && incident.service !== filters.service) return false;
    const created = new Date(incident.createdAt).getTime();
    if (filters.from && created < startOfDay(filters.from)) return false;
    if (filters.to && created > endOfDay(filters.to)) return false;
    return true;
  });
}

export default function IncidentHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const incidents = useAsync(listIncidents);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    query: searchParams.get('q') ?? '',
    status: '',
    environment: '',
    service: '',
    from: '',
    to: '',
  });

  const services = useMemo(() => [...new Set(incidents.data?.map((item) => item.service) ?? [])].sort(), [incidents.data]);
  const filtered = useMemo(() => filterIncidents(incidents.data ?? [], filters), [incidents.data, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const update = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    if (patch.query !== undefined) setSearchParams(patch.query ? { q: patch.query } : {}, { replace: true });
  };

  const hasActiveFilters = Object.entries(filters).some(([, value]) => value !== '');

  const clearFilters = () => {
    setFilters({ query: '', status: '', environment: '', service: '', from: '', to: '' });
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  if (incidents.loading) return <LoadingState label="Loading incidents..." />;
  if (incidents.error || !incidents.data) {
    return <EmptyState tone="error" title="Couldn't load incidents" description={incidents.error ?? 'No data returned.'} />;
  }

  const inputClass =
    'rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-slate-100 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-edge bg-panel p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder="Search by title, ID, or service"
              className={`${inputClass} w-full pl-9`}
            />
          </label>
          <select aria-label="Filter by status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className={inputClass}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select aria-label="Filter by environment" value={filters.environment} onChange={(e) => update({ environment: e.target.value })} className={inputClass}>
            <option value="">All environments</option>
            {(Object.keys(ENVIRONMENT_LABELS) as (keyof typeof ENVIRONMENT_LABELS)[]).map((env) => (
              <option key={env} value={env}>
                {ENVIRONMENT_LABELS[env]}
              </option>
            ))}
          </select>
          <select aria-label="Filter by service" value={filters.service} onChange={(e) => update({ service: e.target.value })} className={inputClass}>
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="From date" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className={`${inputClass} min-w-0`} />
            <input aria-label="To date" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} className={`${inputClass} min-w-0`} />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{filtered.length} matching incidents</span>
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200">
              <X className="h-3 w-3" aria-hidden /> Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-edge bg-panel shadow-card">
        {visible.length === 0 ? (
          <EmptyState
            title="No incidents match these filters"
            description="Try a different search term or clear the filters to see every incident."
            action={
              <button type="button" onClick={clearFilters} className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-200 hover:bg-raised">
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <IncidentTable incidents={visible} />
            <div className="border-t border-edge px-5 py-3">
              <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
