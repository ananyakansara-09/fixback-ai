import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone: 'violet' | 'blue' | 'amber' | 'emerald';
}

const TONE_CLASSES: Record<StatCardProps['tone'], string> = {
  violet: 'bg-violet-500/10 text-violet-300 ring-violet-400/20',
  blue: 'bg-blue-500/10 text-blue-300 ring-blue-400/20',
  amber: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
};

export function StatCard({ label, value, hint, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="group rounded-xl border border-edge bg-panel p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-slate-600">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${TONE_CLASSES[tone]}`}>
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
