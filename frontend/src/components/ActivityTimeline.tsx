import { AlertOctagon, BookCheck, CheckCircle2, Database, ScanSearch, type LucideIcon } from 'lucide-react';
import { formatRelative } from '@/utils/format';
import type { ActivityEvent, ActivityType } from '@/types/dashboard';

const ICONS: Record<ActivityType, { icon: LucideIcon; className: string }> = {
  incident_submitted: { icon: AlertOctagon, className: 'bg-amber-500/10 text-amber-300' },
  analysis_completed: { icon: ScanSearch, className: 'bg-blue-500/10 text-blue-300' },
  memory_recalled: { icon: Database, className: 'bg-violet-500/10 text-violet-300' },
  root_cause_confirmed: { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-300' },
  memory_retained: { icon: BookCheck, className: 'bg-violet-500/10 text-violet-300' },
};

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="relative space-y-5">
      {events.map((event, index) => {
        const { icon: Icon, className } = ICONS[event.type];
        return (
          <li key={event.id} className="relative flex gap-3 animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
            {index < events.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-8px)] w-px bg-edge" aria-hidden />}
            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-edge ${className}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-slate-100">{event.title}</p>
              <p className="text-xs leading-relaxed text-slate-400">{event.description}</p>
              <p className="mt-1 text-[11px] text-slate-500">{formatRelative(event.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
