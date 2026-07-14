import { forwardRef, type ReactNode, type TableHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> extends TableHTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data',
  className,
  ...props
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--ds-color-text-muted)] text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--ds-color-border)]">
      <table className={cn('w-full text-sm', className)} {...props}>
        <thead>
          <tr className="bg-[var(--ds-color-bg-1)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-medium text-[var(--ds-color-text-secondary)] text-xs uppercase tracking-wider',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ds-color-border)]">
          {data.map((item, index) => (
            <tr
              key={(item.id as string) || index}
              className={cn(
                'bg-[var(--ds-color-surface)] transition-colors',
                onRowClick && 'cursor-pointer hover:bg-[var(--ds-color-bg-1)]',
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-[var(--ds-color-text-primary)]', col.className)}>
                  {col.render ? col.render(item, index) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
