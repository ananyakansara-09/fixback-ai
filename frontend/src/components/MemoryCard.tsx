import { BookCheck, Sparkles } from 'lucide-react';
import { formatPercent, MEMORY_TYPE_LABELS, formatDate } from '@/utils/format';
import type { Memory, MemorySearchResult } from '@/types/memory';

type MemoryCardProps = {
  memory: Memory | MemorySearchResult;
};

export function MemoryCard({ memory }: MemoryCardProps) {
  const match = 'matchReason' in memory ? memory : null;

  return (
    <article className="flex flex-col rounded-xl border border-violet-400/20 bg-panel p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
          <BookCheck className="h-3.5 w-3.5" aria-hidden />
          Verified memory
        </span>
        <span className="rounded-full border border-edge px-2.5 py-1 text-xs text-slate-400">{MEMORY_TYPE_LABELS[memory.type]}</span>
        {match && match.matchScore > 0 && (
          <span className="ml-auto font-mono text-xs text-violet-300">{formatPercent(match.matchScore)} match</span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {memory.id} · from {memory.sourceIncidentId} · {memory.service} · {memory.environment} · retained {formatDate(memory.retainedAt)}
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Historical error</dt>
          <dd className="mt-1 font-mono text-xs leading-relaxed text-slate-300">{memory.historicalError}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Confirmed root cause</dt>
          <dd className="mt-1 leading-relaxed text-slate-200">{memory.confirmedRootCause}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Verified resolution</dt>
          <dd className="mt-1 leading-relaxed text-slate-200">{memory.verifiedResolution}</dd>
        </div>
      </dl>

      {match?.matchReason && (
        <div className="mt-4 flex gap-2 rounded-lg border border-blue-400/20 bg-blue-500/5 p-3 text-xs text-blue-200">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">Why it is relevant:</span> {match.matchReason}
          </p>
        </div>
      )}
    </article>
  );
}
