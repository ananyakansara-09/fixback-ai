import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookCheck,
  CheckCircle2,
  ListChecks,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { MemoryCard } from '@/components/MemoryCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { getErrorMessage } from '@/services/apiClient';
import { confirmResolution, getIncident } from '@/services/incidentService';
import type { Incident } from '@/types/incident';
import { ENVIRONMENT_LABELS, formatDateTime } from '@/utils/format';

export default function IncidentDetails() {
  const { id = '' } = useParams();
  const incident = useAsync(() => getIncident(id), [id]);

  if (incident.loading) return <LoadingState label="Loading incident..." />;
  if (incident.error || !incident.data) {
    return (
      <EmptyState
        tone="error"
        title="Incident unavailable"
        description={incident.error ?? 'This incident could not be found.'}
        action={
          <Link to="/incidents" className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-200 hover:bg-raised">
            Back to history
          </Link>
        }
      />
    );
  }

  const data = incident.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/incidents" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All incidents
        </Link>
        <StatusBadge status={data.status} />
      </div>

      {data.status === 'analyzing' ? (
        <div className="rounded-xl border border-edge bg-panel shadow-card">
          <LoadingState label="AI is still analyzing this incident. Engineering memory is being checked." />
          <div className="pb-8 text-center">
            <button type="button" onClick={incident.reload} className="inline-flex items-center gap-2 rounded-lg border border-edge px-4 py-2 text-sm text-slate-200 hover:bg-raised">
              <RefreshCw className="h-4 w-4" aria-hidden /> Check again
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <CurrentIncident incident={data} />
            {data.diagnosis && (
              <DiagnosisCard
                diagnosis={data.diagnosis}
                similarity={data.recalledMemories[0]?.matchScore}
              />
            )}
            <RelevantMemories incident={data} />
          </div>

          <div className="space-y-6">
            {data.diagnosis && <InvestigationSteps steps={data.diagnosis.recommendations} />}
            <ResolutionPanel incident={data} onSaved={incident.reload} />
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentIncident({ incident }: { incident: Incident }) {
  const envLabel =
    ENVIRONMENT_LABELS[incident.environment as keyof typeof ENVIRONMENT_LABELS] ??
    incident.environment;

  return (
    <section className="rounded-xl border border-edge bg-panel p-5 shadow-card">
      <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Current incident</h2>
      <h3 className="mt-2 text-lg font-semibold text-slate-50">{incident.title}</h3>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <Meta label="Incident Code" value={incident.incident_code || incident.id} mono />
        <Meta label="Service" value={incident.service} mono />
        <Meta label="Environment" value={envLabel} />
        <Meta label="Submitted" value={formatDateTime(incident.createdAt)} />
      </dl>
      <div className="mt-5 space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Error</p>
          <p className="mt-1 rounded-lg bg-rose-500/5 px-3 py-2 font-mono text-sm text-rose-200">{incident.errorMessage}</p>
        </div>
        {incident.logs && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Logs</p>
            <pre className="scrollbar-thin mt-1 max-h-56 overflow-auto rounded-lg border border-edge bg-canvas p-3 font-mono text-xs leading-relaxed text-slate-300">
              {incident.logs}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-100 ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}

function RelevantMemories({ incident }: { incident: Incident }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <BookCheck className="h-4 w-4 text-emerald-300" aria-hidden />
        <h2 className="text-base font-semibold text-slate-100">Relevant Engineering Memory</h2>
      </div>
      <p className="mb-4 text-sm text-slate-400">Verified history from past incidents. These are confirmed facts from your team, not AI guesses.</p>
      {incident.recalledMemories.length === 0 ? (
        <EmptyState
          title="No similar incidents in memory"
          description="This looks new to FixBack. Confirm the root cause once you find it, and future incidents will benefit."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {incident.recalledMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </section>
  );
}

function InvestigationSteps({ steps }: { steps: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <section className="rounded-xl border border-edge bg-panel p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <ListChecks className="h-4 w-4 text-violet-300" aria-hidden /> Recommended Steps
        </h2>
        <span className="font-mono text-xs text-slate-500">
          {doneCount}/{steps.length}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step}>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-edge p-3 text-sm transition hover:bg-raised/60">
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={(event) => setChecked((current) => ({ ...current, [index]: event.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-violet-500"
              />
              <span className={checked[index] ? 'text-slate-500 line-through' : 'text-slate-200'}>{step}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResolutionPanel({ incident, onSaved }: { incident: Incident; onSaved: () => void }) {
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [errors, setErrors] = useState<{ rootCause?: string; resolution?: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasConfirmedResolution =
    incident.status === 'resolved' || (Boolean(incident.root_cause) && Boolean(incident.resolution));

  const rootCauseStr =
    typeof incident.root_cause === 'string'
      ? incident.root_cause
      : typeof incident.resolution === 'object' && incident.resolution
      ? incident.resolution.confirmedRootCause
      : '';

  const resolutionStr =
    typeof incident.resolution === 'string'
      ? incident.resolution
      : typeof incident.resolution === 'object' && incident.resolution
      ? incident.resolution.verifiedResolution
      : '';

  const handleRetryRetention = async () => {
    if (!rootCauseStr || !resolutionStr) return;
    setSaving(true);
    try {
      const res = await confirmResolution(incident.id, {
        confirmedRootCause: rootCauseStr,
        verifiedResolution: resolutionStr,
      });
      if (res.memoryRetained) {
        toast.success('Resolution successfully retained in Hindsight Cloud');
        onSaved();
      } else {
        toast.error('Retention failed. Check Hindsight Cloud service readiness.');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (hasConfirmedResolution) {
    const isRetained = Boolean(incident.memory_retained);
    const confirmedTime = incident.resolved_at || incident.updated_at || new Date().toISOString();

    return (
      <section
        className={`rounded-xl border p-5 shadow-card ${
          isRetained
            ? 'border-emerald-400/25 bg-emerald-500/[0.04]'
            : 'border-amber-400/30 bg-amber-500/[0.04]'
        }`}
      >
        <div className={`flex items-center gap-2 ${isRetained ? 'text-emerald-300' : 'text-amber-300'}`}>
          {isRetained ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : (
            <AlertTriangle className="h-4 w-4" aria-hidden />
          )}
          <h2 className="text-base font-semibold">
            {isRetained
              ? 'Resolution Confirmed & Retained in Hindsight'
              : 'Resolution Confirmed in DB (Memory Not Retained)'}
          </h2>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {isRetained
            ? `Verified and saved to engineering memory on ${formatDateTime(confirmedTime)}`
            : 'Incident is marked resolved in PostgreSQL, but Hindsight cloud retention failed or was skipped.'}
        </p>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Confirmed root cause</p>
            <p className="mt-1 leading-relaxed text-slate-100">{rootCauseStr}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Verified resolution</p>
            <p className="mt-1 leading-relaxed text-slate-100">{resolutionStr}</p>
          </div>
        </div>

        {!isRetained && (
          <div className="mt-5 border-t border-edge pt-3">
            <button
              type="button"
              onClick={handleRetryRetention}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3.5 py-2 text-xs font-medium text-white shadow-glow transition hover:bg-violet-400 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} aria-hidden />
              {saving ? 'Retrying retention...' : 'Retry Hindsight Retention'}
            </button>
          </div>
        )}
      </section>
    );
  }

  const validate = () => {
    const next: typeof errors = {};
    if (rootCause.trim().length < 3) next.rootCause = 'Describe the confirmed root cause (at least 3 characters).';
    if (resolution.trim().length < 3) next.resolution = 'Describe what fixed it (at least 3 characters).';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleReview = (event: FormEvent) => {
    event.preventDefault();
    if (validate()) setModalOpen(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await confirmResolution(incident.id, {
        confirmedRootCause: rootCause.trim(),
        verifiedResolution: resolution.trim(),
      });

      if (res.memoryRetained) {
        toast.success('Resolution saved to engineering memory', {
          description: `${incident.incident_code || incident.id} will inform future incidents.`,
        });
      } else {
        toast.warning('Resolution saved in database, but Hindsight retention failed or was skipped.', {
          description: 'You can retry memory retention at any time.',
        });
      }

      setModalOpen(false);
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (hasError?: string) =>
    `mt-1.5 w-full rounded-lg border bg-canvas px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
      hasError ? 'border-rose-400/60' : 'border-edge focus:border-violet-400/60'
    }`;

  return (
    <section className="rounded-xl border border-edge bg-panel p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
        <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden /> Resolution Confirmation
      </h2>
      <p className="mt-1 text-sm text-slate-400">Write what your team verified. Only confirmed facts are saved to memory.</p>

      <form onSubmit={handleReview} noValidate className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Confirmed Root Cause
          <textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            rows={3}
            className={fieldClass(errors.rootCause)}
            placeholder="What was actually causing the failure?"
          />
          {errors.rootCause && <span className="mt-1 block text-xs text-rose-300">{errors.rootCause}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Verified Resolution
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            className={fieldClass(errors.resolution)}
            placeholder="What fixed it, and how was it verified?"
          />
          {errors.resolution && <span className="mt-1 block text-xs text-rose-300">{errors.resolution}</span>}
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-violet-400 active:scale-[0.98]"
        >
          Confirm Resolution &amp; Save to Memory
        </button>
      </form>

      <ConfirmationModal
        open={modalOpen}
        title="Save this resolution to memory?"
        description="Future incidents with similar errors will recall this confirmed root cause and fix."
        confirmLabel="Save to memory"
        loading={saving}
        onConfirm={handleConfirm}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-3 rounded-lg border border-edge bg-canvas p-4 text-sm">
          <p className="text-slate-300">
            <span className="text-slate-500">Root cause:</span> {rootCause.trim()}
          </p>
          <p className="text-slate-300">
            <span className="text-slate-500">Resolution:</span> {resolution.trim()}
          </p>
        </div>
      </ConfirmationModal>
    </section>
  );
}
