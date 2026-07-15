import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const toastVariants = cva(
  'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] shadow-md text-sm font-medium',
  {
    variants: {
      variant: {
        success: 'bg-[var(--ds-color-success)] text-white',
        error: 'bg-[var(--ds-color-danger)] text-white',
        warning: 'bg-[var(--ds-color-warning)] text-white',
        info: 'bg-[var(--ds-color-info)] text-white',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
  message: string;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Toast({ variant, message, action, onDismiss, className }: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }), className)} role="alert" aria-live="polite">
      <span className="flex-1">{message}</span>
      {action}
      {onDismiss && (
        <button onClick={onDismiss} className="ml-2 hover:opacity-80 text-current" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
