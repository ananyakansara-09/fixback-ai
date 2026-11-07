import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Database,
  Layers,
  Loader2,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { MemoryCard } from '@/components/MemoryCard';
import { StatCard } from '@/components/StatCard';
import { useAsync } from '@/hooks/useAsync';
import { getDashboard } from '@/services/dashboardService';
import { searchMemories } from '@/services/memoryService';
import { getErrorMessage } from '@/services/apiClient';
import type { MemorySearchResult } from '@/types/memory';
import { MEMORY_TYPE_LABELS, formatRelative } from '@/utils/format';

const WORKFLOW: { label: string; detail: string; icon: LucideIcon; memory: boolean }[] = [
  { label: 'Incident Submitted', detail: 'Error and logs arrive', icon: Layers, memory: false },
  { label: 'Hindsight Recall', detail: 'Similar verified memories', icon: Database, memory: true },
  { label: 'AI Diagnosis', detail: 'Hypotheses are drafted', icon: Sparkles, memory: false },
  { label: 'Developer Confirms', detail: 'Real root cause verified', icon: BrainCircuit, memory: false },
  { label: 'Hindsight Retains Memory', detail: 'Resolution is stored', icon: Database, memory: true },
  { label: 'Future Incident Benefits', detail: 'Next team solves it faster', icon: BrainCircuit, memory: false },
];

export default function MemoryExplorer() {
  const dashboard = useAsync(getDashboard);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [results, setResults] = useState<MemorySearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setActiveQuery('');
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setActiveQuery(searchTerm.trim());

    try {
      const data = await searchMemories(searchTerm.trim());
      setResults(data);
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Perform search on mount or when user submits
  useEffect(() => {
    // Initial recall of database pool or recent memories
    executeSearch('database');
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(query);
    }
  };

  const visible = (results ?? []).filter(
    (memory) => typeFilter === 'all' || memory.type === typeFilter
  );

  const memoryEvents =
    dashboard.data?.timeline.filter(
      (event) => event.type === 'memory_recalled' || event.type === 'memory_retained' || event.type === 'root_cause_confirmed'
    ) ?? [];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Memories Stored"
          value={dashboard.data?.stats.memoriesStored ?? '--'}
          hint="Verified in Hindsight Cloud"
          icon={Database}
          tone="violet"
        />
        <StatCard
          label="Recent Recalls"
          value={dashboard.data?.memory.recentRecalls.length ?? '--'}
          hint="Surfaced in incident analyses"
          icon={Sparkles}
          tone="blue"
        />
        <StatCard
          label="Services Covered"
          value={dashboard.data ? new Set((results ?? []).map((m) => m.service)).size || 1 : '--'}
          hint="Across retained memories"
          icon={Layers}
          tone="emerald"
        />
        <StatCard
          label="Last Memory Update"
          value={
            dashboard.data?.memory.lastUpdatedAt
              ? formatRelative(dashboard.data.memory.lastUpdatedAt)
              : 'Never'
          }
          hint="Most recent retained memory"
          icon={BrainCircuit}
          tone="amber"
        />
      </section>

      <section className="rounded-xl border border-violet-400/25 bg-panel p-6 shadow-card">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-50">How Hindsight remembers your incidents</h2>
          <p className="mt-1 text-sm text-slate-400">Every confirmed fix makes the next diagnosis faster.</p>
        </div>
        <ol className="flex snap-x gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-[repeat(11,minmax(0,1fr))] lg:items-stretch lg:overflow-visible">
          {WORKFLOW.map((step, index) => (
            <li key={step.label} className="contents">
              <div
                className={`flex min-w-[10.5rem] snap-start flex-col rounded-lg border p-4 lg:col-span-2 ${
                  step.memory ? 'border-violet-400/40 bg-violet-500/10 shadow-glow' : 'border-edge bg-raised/50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    step.memory ? 'bg-violet-500/20 text-violet-200' : 'bg-canvas text-slate-300'
                  }`}
                >
                  <step.icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-100">{step.label}</p>
                <p className="mt-1 text-xs text-slate-400">{step.detail}</p>
              </div>
              {index < WORKFLOW.length - 1 && (
                <div className="hidden items-center justify-center text-slate-600 lg:flex lg:col-span-1" aria-hidden>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-xl border border-edge bg-panel p-4 shadow-card">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search memory: e.g. connection pool, payment-api, timeout"
                  className="w-full rounded-lg border border-edge bg-canvas py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-violet-400 disabled:opacity-60"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Search</span>
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {['all', ...Object.keys(MEMORY_TYPE_LABELS)].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    typeFilter === type
                      ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
                      : 'border-edge text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'all' ? 'All types' : MEMORY_TYPE_LABELS[type as keyof typeof MEMORY_TYPE_LABELS]}
                </button>
              ))}
            </div>
          </div>

          {searchError ? (
            <EmptyState
              tone="error"
              title="Memory Search Notice"
              description={searchError}
              action={
                <button
                  type="button"
                  onClick={() => executeSearch(query || 'payment-api')}
                  className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-200 hover:bg-raised"
                >
                  Retry Search
                </button>
              }
            />
          ) : searching ? (
            <LoadingState label="Searching Hindsight Cloud memory bank..." />
          ) : results === null ? (
            <EmptyState
              title="Search engineering memory"
              description="Type keywords above to search verified historical incident root causes and solutions."
            />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No memories match this search"
              description={
                activeQuery
                  ? `No verified historical memories found for query: "${activeQuery}". Confirm incident root causes to populate memory.`
                  : 'Try searching with different terms like "pool", "timeout", or a service name.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visible.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-edge bg-panel p-5 shadow-card h-fit">
          <h2 className="mb-5 text-base font-semibold text-slate-100">Recent Memory Activity</h2>
          {dashboard.loading ? (
            <LoadingState compact label="Loading activity..." />
          ) : memoryEvents.length === 0 ? (
            <EmptyState
              title="No memory activity yet"
              description="Recalls and retained memories will appear here once incidents are diagnosed or confirmed."
            />
          ) : (
            <ActivityTimeline events={memoryEvents} />
          )}
        </aside>
      </section>
    </div>
  );
}
