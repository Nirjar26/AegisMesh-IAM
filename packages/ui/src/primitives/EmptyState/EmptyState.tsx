import { type ReactNode, type ElementType } from 'react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'py-16 flex flex-col items-center gap-3 text-center px-4',
        'bg-[var(--ds-color-surface)] border border-[var(--ds-color-border)] rounded-[var(--radius-lg)] shadow-sm',
        className,
      )}
    >
      {Icon && (
        <div className="bg-[var(--ds-color-bg-1)] rounded-[var(--radius-lg)] p-4 text-[var(--ds-color-text-muted)]">
          <Icon size={32} />
        </div>
      )}
      <p className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">{title}</p>
      {description && (
        <p className="text-[13px] text-[var(--ds-color-text-muted)] max-w-sm">{description}</p>
      )}
      {action && <div className="flex gap-2 mt-2">{action}</div>}
    </div>
  );
}
