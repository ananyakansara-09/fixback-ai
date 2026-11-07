import { Bot, FlaskConical } from 'lucide-react';
import { formatPercent } from '@/utils/format';
import type { Diagnosis } from '@/types/incident';

const CONFIDENCE_STYLES: Record<Diagnosis['confidence'], string> = {
  high: 'border-emerald-400/25 text-emerald-300',
  medium: 'border-amber-400/25 text-amber-300',
  low: 'border-slate-500/40 text-slate-300',
};

export function DiagnosisCard({ diagnosis, similarity }: { diagnosis: Diagnosis; similarity?: number }) {
  return (
    <section className="rounded-xl border border-dashed border-blue-400/35 bg-blue-500/[0.04] p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200">
          <Bot className="h-3.5 w-3.5" aria-hidden />
          AI-generated hypotheses, not verified facts
        </span>
        <span className={`ml-auto rounded-full border px-2.5 py-1 text-xs capitalize ${CONFIDENCE_STYLES[diagnosis.confidence]}`}>
          {diagnosis.confidence} confidence
          {similarity !== undefined && similarity > 0 ? ` · ${formatPercent(similarity)} similarity` : ''}
        </span>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Incident summary</h3>
          <p className="mt-1.5 leading-relaxed text-slate-300">{diagnosis.summary}</p>
        </div>
        <div className="rounded-lg border border-edge bg-canvas/60 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            Possible root cause (hypothesis)
          </h3>
          <p className="mt-1.5 leading-relaxed text-slate-100">{diagnosis.possibleRootCause}</p>
        </div>
      </div>
    </section>
  );
}
