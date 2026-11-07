import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading...', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center ${compact ? 'gap-2 py-6' : 'gap-3 py-16'}`}
    >
      <Loader2 className="h-6 w-6 animate-spin text-violet-400" aria-hidden />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
