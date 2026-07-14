import { forwardRef, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const inputVariants = cva(
  [
    'flex w-full rounded-[var(--radius-md)]',
    'border border-[var(--ds-color-border)]',
    'bg-[var(--ds-color-surface)]',
    'px-3 py-2 text-sm',
    'text-[var(--ds-color-text-primary)]',
    'placeholder:text-[var(--ds-color-text-muted)]',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-accent)] focus-visible:border-[var(--ds-color-accent)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'aria-[invalid=true]:border-[var(--ds-color-danger)] aria-[invalid=true]:ring-[var(--ds-color-danger)]',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 text-xs',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, label, error, helper, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--ds-color-text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(inputVariants({ size }), className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--ds-color-danger)]" role="alert">
            {error}
          </p>
        )}
        {helper && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-[var(--ds-color-text-muted)]">
            {helper}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
