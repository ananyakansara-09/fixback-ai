import { CheckCircle2, CircleAlert, Cpu, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useAsync } from '@/hooks/useAsync';
import { getSettings, getSystemHealth } from '@/services/dashboardService';
import type { ServiceConnection } from '@/types/dashboard';
import { formatDateTime } from '@/utils/format';

export default function Settings() {
  const settings = useAsync(getSettings);
  const health = useAsync(getSystemHealth);

  if (settings.loading) return <LoadingState label="Loading settings..." />;
  if (settings.error || !settings.data) {
    return <EmptyState tone="error" title="Couldn't load settings" description={settings.error ?? 'No data returned.'} />;
  }

  const { team, app } = settings.data;

  const testConnections = () => {
    health.reload();
    toast.info('Checking connections...');
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="rounded-xl border border-edge bg-panel p-6 shadow-card">
        <header className="mb-5 flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-300" aria-hidden />
          <h2 className="text-base font-semibold text-slate-100">Team details</h2>
        </header>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Team name" value={team.name} />
          <Detail label="Plan" value={team.plan} />
          <Detail label="Team slug" value={team.slug} mono />
          <Detail label="Signed in as" value={settings.data.user.email} mono />
        </dl>
        <h3 className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">Members</h3>
        <ul className="mt-3 divide-y divide-edge rounded-lg border border-edge">
          {team.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-200">{member.initials}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-100">{member.name}</p>
                <p className="text-xs text-slate-500">{member.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-6">
        <section className="rounded-xl border border-edge bg-panel p-6 shadow-card">
          <header className="mb-5 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-300" aria-hidden />
            <h2 className="text-base font-semibold text-slate-100">Application details</h2>
          </header>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Version" value={app.version} mono />
            <Detail label="Environment" value={app.environment} />
            <Detail label="API base URL" value={app.apiBaseUrl} mono />
            <Detail label="Memory namespace" value={app.memoryNamespace} mono />
          </dl>
        </section>

        <section className="rounded-xl border border-edge bg-panel p-6 shadow-card">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden />
              <h2 className="text-base font-semibold text-slate-100">Connection status</h2>
            </div>
            <button
              type="button"
              onClick={testConnections}
              disabled={health.loading}
              className="inline-flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-raised disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${health.loading ? 'animate-spin' : ''}`} aria-hidden />
              Test connections
            </button>
          </header>

          {health.error && !health.data ? (
            <EmptyState tone="error" title="Status unavailable" description={health.error} />
          ) : !health.data ? (
            <LoadingState compact label="Checking connections..." />
          ) : (
            <>
              <ul className="space-y-3">
                <ConnectionRow connection={health.data.connections.backend} />
                <ConnectionRow connection={health.data.connections.hindsight} />
                <ConnectionRow connection={health.data.connections.groq} />
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Last checked {formatDateTime(health.data.checkedAt)}. API keys are stored on the server and are never shown here.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-slate-100 ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}

function ConnectionRow({ connection }: { connection: ServiceConnection }) {
  const connected = connection.state === 'connected';
  return (
    <li className="flex items-center gap-3 rounded-lg border border-edge p-3.5">
      {connected ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      ) : (
        <CircleAlert className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">{connection.name}</p>
        <p className="truncate text-xs text-slate-500">{connection.detail}</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-medium ${connected ? 'text-emerald-300' : 'text-amber-300'}`}>{connected ? 'Connected' : 'Degraded'}</p>
        {connection.latencyMs !== null && <p className="font-mono text-[11px] text-slate-500">{connection.latencyMs} ms</p>}
      </div>
    </li>
  );
}
