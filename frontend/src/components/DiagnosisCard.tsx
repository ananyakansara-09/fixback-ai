import { Bot, Database, FlaskConical, History } from 'lucide-react';
import { formatPercent } from '@/utils/format';
import type { AIDiagnosisSchema, Diagnosis } from '@/types/incident';

const CONFIDENCE_STYLES = {
  high: 'border-emerald-400/25 text-emerald-300',
  medium: 'border-amber-400/25 text-amber-300',
  low: 'border-slate-500/40 text-slate-300',
};

interface DiagnosisCardProps {
  diagnosis: Diagnosis | AIDiagnosisSchema;
  similarity?: number;
}

export function DiagnosisCard({ diagnosis, similarity }: DiagnosisCardProps) {
  // Support both backend schema and frontend diagnosis interface
  const summary = 'summary' in diagnosis ? diagnosis.summary : '';
  const possibleRootCause =
    'possible_root_cause' in diagnosis
      ? diagnosis.possible_root_cause
      : (diagnosis as Diagnosis).possibleRootCause;
  const historicalContext =
    'historical_context' in diagnosis
      ? diagnosis.historical_context
      : (diagnosis as Diagnosis).historicalContext;
  const memoryUsed =
    'memory_used' in diagnosis
      ? diagnosis.memory_used
      : (diagnosis as Diagnosis).memoryUsed ?? false;
  const confidence = ('confidence' in diagnosis ? (diagnosis as Diagnosis).confidence : 'high') || 'high';

  return (
    <section className="rounded-xl border border-dashed border-blue-400/35 bg-blue-500/[0.04] p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200">
          <Bot className="h-3.5 w-3.5" aria-hidden />
          AI Hypothesis (Unconfirmed)
        </span>

        {memoryUsed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
            <Database className="h-3 w-3" aria-hidden />
            Memory-Augmented Diagnosis
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-xs text-slate-400">
            No Past Precedent in Memory
          </span>
        )}

        <span
          className={`ml-auto rounded-full border px-2.5 py-1 text-xs capitalize ${
            CONFIDENCE_STYLES[confidence as keyof typeof CONFIDENCE_STYLES] ?? CONFIDENCE_STYLES.medium
          }`}
        >
          {confidence} confidence
          {similarity !== undefined && similarity > 0 ? ` · ${formatPercent(similarity)} similarity` : ''}
        </span>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Incident summary</h3>
          <p className="mt-1.5 leading-relaxed text-slate-300">{summary}</p>
        </div>

        <div className="rounded-lg border border-edge bg-canvas/60 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-amber-400/90">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            Possible root cause (Hypothesis — Subject to engineer confirmation)
          </h3>
          <p className="mt-1.5 leading-relaxed text-slate-100">{possibleRootCause}</p>
        </div>

        {historicalContext && (
          <div className="rounded-lg border border-edge/60 bg-raised/40 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              <History className="h-3.5 w-3.5 text-violet-300" aria-hidden />
              Historical Engineering Context (Hindsight Recall)
            </h3>
            <p className="mt-1.5 leading-relaxed text-slate-300 text-xs">{historicalContext}</p>
          </div>
        )}
      </div>
    </section>
  );
}
