import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeIncident } from '@/services/incidentService';
import { getErrorMessage } from '@/services/apiClient';
import type { Environment, IncidentInput } from '@/types/incident';
import { ENVIRONMENT_LABELS } from '@/utils/format';

type FormErrors = Partial<Record<keyof IncidentInput, string>>;

const EMPTY_FORM: IncidentInput = {
  title: '',
  service: '',
  environment: 'production',
  errorMessage: '',
  logs: '',
};

const SAMPLE_FORM: IncidentInput = {
  title: 'Checkout requests timing out during peak traffic',
  service: 'payment-api',
  environment: 'production',
  errorMessage: 'Database connection pool exhausted. Requests are timing out.',
  logs: `Service: payment-api
Environment: Production
Connection timeout after 30000ms.
Database pool reached maximum connection limit.`,
};

const SERVICE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateIncident(form: IncidentInput): FormErrors {
  const errors: FormErrors = {};
  if (form.title.trim().length < 3) errors.title = 'Title must be at least 3 characters.';
  if (!form.service.trim()) errors.service = 'Service name is required.';
  if (form.errorMessage.trim().length < 3) errors.errorMessage = 'Paste the error message (at least 3 characters).';
  return errors;
}

export default function AnalyzeIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState<IncidentInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof IncidentInput>(key: K, value: IncidentInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateIncident(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const incident = await analyzeIncident({
        ...form,
        title: form.title.trim(),
        service: form.service.trim(),
        errorMessage: form.errorMessage.trim(),
        logs: form.logs.trim(),
      });
      toast.success(`${incident.incident_code || incident.id} analyzed`, { description: 'Review the diagnosis and relevant memories.' });
      navigate(`/incidents/${incident.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-lg border bg-canvas px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
      hasError ? 'border-rose-400/60 focus:border-rose-400' : 'border-edge focus:border-violet-400/60'
    }`;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-xl border border-edge bg-panel p-6 shadow-card xl:col-span-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Describe the incident</h2>
          <p className="mt-1 text-sm text-slate-400">FixBack compares it with verified engineering memory before suggesting causes.</p>
        </div>

        {submitError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3.5 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Incident title" error={errors.title} className="md:col-span-2">
            <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Checkout requests timing out during peak traffic" className={inputClass(errors.title)} />
          </Field>
          <Field label="Service name" error={errors.service}>
            <input
              value={form.service}
              onChange={(e) => update('service', e.target.value)}
              placeholder="payment-api"
              list="service-suggestions"
              className={`${inputClass(errors.service)} font-mono`}
            />
            <datalist id="service-suggestions">
              {['payment-api', 'auth-service', 'checkout-web', 'inventory-worker', 'notification-service', 'search-api'].map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field label="Environment">
            <select value={form.environment} onChange={(e) => update('environment', e.target.value as Environment)} className={inputClass()}>
              {(Object.keys(ENVIRONMENT_LABELS) as (keyof typeof ENVIRONMENT_LABELS)[]).map((env) => (
                <option key={env} value={env}>
                  {ENVIRONMENT_LABELS[env]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Error message" error={errors.errorMessage} className="md:col-span-2">
            <input value={form.errorMessage} onChange={(e) => update('errorMessage', e.target.value)} placeholder="Database connection pool exhausted. Requests are timing out." className={inputClass(errors.errorMessage)} />
          </Field>
          <Field label="Error logs" error={errors.logs} className="md:col-span-2" hint="Paste the raw log lines around the first failure.">
            <textarea
              value={form.logs}
              onChange={(e) => update('logs', e.target.value)}
              rows={12}
              placeholder={`Service: payment-api\nEnvironment: Production\n\nConnection timeout after 30000ms.\nDatabase pool reached maximum connection limit.`}
              className={`${inputClass(errors.logs)} resize-y font-mono text-[13px] leading-relaxed`}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-edge pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              setForm(SAMPLE_FORM);
              setErrors({});
            }}
            className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-raised"
          >
            Load sample incident
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-violet-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {submitting ? 'Analyzing incident...' : 'Analyze Incident'}
          </button>
        </div>
      </form>

      <aside className="space-y-4 rounded-xl border border-edge bg-panel p-6 shadow-card h-fit">
        <h3 className="text-sm font-semibold text-slate-100">What happens next</h3>
        <ol className="space-y-3 text-sm text-slate-400">
          <li>1. Hindsight recalls verified memories from similar past incidents.</li>
          <li>2. The AI drafts possible root causes, clearly marked as hypotheses.</li>
          <li>3. You confirm the real root cause and fix, and that becomes memory.</li>
        </ol>
      </aside>
    </div>
  );
}

function Field({ label, error, hint, className = '', children }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-300">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
