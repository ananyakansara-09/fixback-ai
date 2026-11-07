import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const buttonClasses =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-edge text-slate-300 transition hover:border-slate-500 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <nav className="flex items-center justify-between gap-3 text-sm text-slate-400" aria-label="Pagination">
      <span>
        Page {page} of {pageCount}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={buttonClasses} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className={buttonClasses}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
