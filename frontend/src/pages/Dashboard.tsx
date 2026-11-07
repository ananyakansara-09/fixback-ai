import { Link } from 'react-router-dom';
import { Activity, BookCheck, CheckCircle2, Clock3, Database, Layers, ArrowRight } from 'lucide-react';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { EmptyState } from '@/components/EmptyState';
import { IncidentActivityChart } from '@/components/IncidentActivityChart';
import { IncidentTable } from '@/components/IncidentTable';
import { LoadingState } from '@/components/LoadingState';
import { StatCard } from '@/components/StatCard';
import { useAsync } from '@/hooks/useAsync';
import { getDashboard } from '@/services/dashboardService';
import { formatRelative } from '@/utils/format';

export default function Dashboard() {
  const dashboard = useAsync(getDashboard);

  if (dashboard.loading) return <LoadingState label="Loading overview..." />;
  if (dashboard.error || !dashboard.data) {
    return <EmptyState tone="error" title="Couldn't load the overview" description={dashboard.error ?? 'No data returned.'} action={<RetryButton onClick={dashboard.reload} />} />;
  }

  const { stats, incidentActivity, recentIncidents, memory, timeline } = dashboard.data;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">Your engineering team should never solve the same incident twice.</p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Incidents" value={stats.totalIncidents} hint="All time" icon={Layers} tone="violet" />
        <StatCard label="Resolved Incidents" value={stats.resolvedIncidents} hint="Root cause confirmed" icon={CheckCircle2} tone="emerald" />
        <StatCard label="Pending Investigation" value={stats.pendingInvestigation} hint="Analyzing or awaiting review" icon={Clock3} tone="amber" />
        <StatCard label="Memories Stored" value={stats.memoriesStored} hint="Verified in Hindsight" icon={Database} tone="blue" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-edge bg-panel p-5 shadow-card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Incident Activity</h2>
              <p className="text-xs text-slate-500">Submitted and resolved incidents, last 14 days</p>
            </div>
          </div>
          <IncidentActivityChart data={incidentActivity} />
        </div>

        <div className="rounded-xl border border-edge bg-panel p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <BookCheck className="h-4 w-4 text-violet-300" aria-hidden />
            <h2 className="text-base font-semibold text-slate-100">Memory Activity</h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-raised/60 p-3">
              <dt className="text-xs text-slate-500">Total retained</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-50">{memory.total}</dd>
            </div>
            <div className="rounded-lg bg-raised/60 p-3">
              <dt className="text-xs text-slate-500">Last update</dt>
              <dd className="mt-1 text-sm font-medium text-slate-100">{memory.lastUpdatedAt ? formatRelative(memory.lastUpdatedAt) : 'Never'}</dd>
            </div>
          </dl>
          <h3 className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-500">Recent memories</h3>
          <ul className="mt-2 space-y-2">
            {memory.recent.map((item) => (
              <li key={item.id} className="rounded-lg border border-edge p-3">
                <p className="truncate text-sm text-slate-100">{item.confirmedRootCause}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.id} · {item.service}
                </p>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-500">Recent recall activity</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
            {memory.recentRecalls.map((event) => (
              <li key={event.id} className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-violet-300" aria-hidden />
                <span className="truncate">{event.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-edge bg-panel shadow-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-edge px-5 py-4">
            <h2 className="text-base font-semibold text-slate-100">Recent Incidents</h2>
            <Link to="/incidents" className="inline-flex items-center gap-1 text-sm font-medium text-violet-300 hover:text-violet-200">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {recentIncidents.length === 0 ? (
            <EmptyState title="No incidents yet" description="Submit your first incident to start building engineering memory." />
          ) : (
            <IncidentTable incidents={recentIncidents} />
          )}
        </div>

        <div className="rounded-xl border border-edge bg-panel p-5 shadow-card">
          <h2 className="mb-5 text-base font-semibold text-slate-100">Recent Activity</h2>
          <ActivityTimeline events={timeline} />
        </div>
      </section>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-200 hover:bg-raised">
      Try again
    </button>
  );
}
