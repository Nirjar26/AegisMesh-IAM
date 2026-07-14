import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--ds-color-surface)] border border-[var(--ds-color-border)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden',
        hover && 'hover:shadow-md hover:border-[var(--ds-color-border-strong)] transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-6 py-4 border-b border-[var(--ds-color-border)] flex items-center gap-3',
        className,
      )}
      {...props}
    >
      {children}
      <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)] flex-1">{title}</h3>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';
