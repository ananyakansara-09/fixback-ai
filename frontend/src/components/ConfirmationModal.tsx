import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmationModal({ open, title, description, children, confirmLabel, loading, onConfirm, onClose }: ConfirmationModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={loading ? undefined : onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg rounded-2xl border border-edge bg-panel p-6 shadow-card animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-slate-50">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-md p-1 text-slate-500 hover:text-slate-200 disabled:opacity-40" aria-label="Dismiss">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-raised disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-violet-400 disabled:opacity-60"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
