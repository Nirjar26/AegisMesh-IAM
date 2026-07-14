import { cn } from '../../utils/cn';

export interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, total, perPage, onChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btnBase = 'px-3 py-1.5 text-sm rounded-[var(--radius-sm)] transition-colors';

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={cn(btnBase, 'text-[var(--ds-color-text-muted)] hover:text-[var(--ds-color-text-primary)] disabled:opacity-30')}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        typeof p === 'number' ? (
          <button
            key={i}
            onClick={() => onChange(p)}
            className={cn(
              btnBase,
              p === page
                ? 'bg-[var(--ds-color-accent)] text-white'
                : 'text-[var(--ds-color-text-secondary)] hover:bg-[var(--ds-color-bg-2)]',
            )}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ) : (
          <span key={i} className="px-2 text-[var(--ds-color-text-muted)]">…</span>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(btnBase, 'text-[var(--ds-color-text-muted)] hover:text-[var(--ds-color-text-primary)] disabled:opacity-30')}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
