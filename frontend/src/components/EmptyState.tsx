import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'error';
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, tone = 'neutral', action }: EmptyStateProps) {
  const Icon = icon ?? (tone === 'error' ? AlertTriangle : Inbox);
  const iconClasses = tone === 'error' ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20' : 'bg-violet-500/10 text-violet-300 ring-violet-400/20';

  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${iconClasses}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
