import { CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import type { IncidentStatus } from '@/types/incident';

const STATUS_STYLES: Record<IncidentStatus, { label: string; className: string; dot: string; icon: typeof Loader2 }> = {
  analyzing: {
    label: 'Analyzing',
    className: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
    dot: 'bg-blue-400',
    icon: Loader2,
  },
  awaiting_confirmation: {
    label: 'Awaiting Confirmation',
    className: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
    icon: Clock3,
  },
  resolved: {
    label: 'Resolved',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
  },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${style.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${status === 'analyzing' ? 'animate-pulse' : ''}`} />
      {style.label}
    </span>
  );
}
