import { useState } from 'react';
import { BookCheck, ChevronDown, ChevronUp, FileText, Sparkles, Tag } from 'lucide-react';
import { formatPercent, MEMORY_TYPE_LABELS, formatDate } from '@/utils/format';
import type { Memory, MemorySearchResult } from '@/types/memory';

type MemoryCardProps = {
  memory: Memory | MemorySearchResult;
};

export function MemoryCard({ memory }: MemoryCardProps) {
  const match = 'matchReason' in memory ? (memory as MemorySearchResult) : null;
  const [showFullContent, setShowFullContent] = useState(false);

  const incidentRef =
    memory.sourceIncidentId ||
    memory.metadata?.incident_code ||
    memory.metadata?.incident_id;

  const typeLabel =
    MEMORY_TYPE_LABELS[memory.type as keyof typeof MEMORY_TYPE_LABELS] ??
    (memory.type ? memory.type.replace(/_/g, ' ') : 'Engineering Memory');

  return (
    <article className="flex flex-col rounded-xl border border-violet-400/20 bg-panel p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
          <BookCheck className="h-3.5 w-3.5" aria-hidden />
          Verified Memory
        </span>
        <span className="rounded-full border border-edge px-2.5 py-1 text-xs text-slate-400 capitalize">
          {typeLabel}
        </span>
        {match && match.matchScore > 0 && (
          <span className="ml-auto font-mono text-xs text-violet-300">
            {formatPercent(match.matchScore)} match
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {memory.id ? `${memory.id} · ` : ''}
        {incidentRef ? `Ref: ${incidentRef} · ` : ''}
        {memory.service} · {memory.environment} · retained {formatDate(memory.retainedAt)}
      </p>

      {/* Structured details if confirmed root cause or verified resolution are present */}
      {(memory.confirmedRootCause || memory.verifiedResolution) && (
        <dl className="mt-4 space-y-3 text-sm">
          {memory.historicalError && memory.historicalError !== memory.content && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Historical error</dt>
              <dd className="mt-1 font-mono text-xs leading-relaxed text-slate-300">
                {memory.historicalError}
              </dd>
            </div>
          )}
          {memory.confirmedRootCause && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Confirmed root cause</dt>
              <dd className="mt-1 leading-relaxed text-slate-200">{memory.confirmedRootCause}</dd>
            </div>
          )}
          {memory.verifiedResolution && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Verified resolution</dt>
              <dd className="mt-1 leading-relaxed text-slate-200">{memory.verifiedResolution}</dd>
            </div>
          )}
        </dl>
      )}

      {/* Raw / full content section */}
      {memory.content && (
        <div className="mt-4 pt-3 border-t border-edge/60">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <FileText className="h-3 w-3" aria-hidden /> Memory Content
            </span>
            <button
              type="button"
              onClick={() => setShowFullContent(!showFullContent)}
              className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
            >
              {showFullContent ? (
                <>
                  Collapse <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  View raw content <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
          {showFullContent ? (
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-edge bg-canvas p-3 font-mono text-[11px] leading-relaxed text-slate-300">
              {memory.content}
            </pre>
          ) : (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
              {memory.content.replace(/===.*?===/g, '').trim()}
            </p>
          )}
        </div>
      )}

      {/* Tags if present */}
      {Array.isArray(memory.tags) && memory.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
          {memory.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded bg-raised/70 px-2 py-0.5 text-[10px] text-slate-400 font-mono"
            >
              <Tag className="h-2.5 w-2.5 text-slate-500" />
              {tag}
            </span>
          ))}
        </div>
      )}

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
