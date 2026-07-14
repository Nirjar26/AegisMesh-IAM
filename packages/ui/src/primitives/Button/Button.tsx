import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-[var(--radius-md)]',
    'font-medium text-sm',
    'transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-color-accent)]',
    'disabled:opacity-50 disabled:pointer-events-none',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--ds-color-accent)] text-white hover:bg-[var(--ds-color-accent-strong)]',
        secondary:
          'bg-[var(--ds-color-surface)] text-[var(--ds-color-text-primary)] border border-[var(--ds-color-border)] hover:bg-[var(--ds-color-bg-2)]',
        ghost:
          'text-[var(--ds-color-text-secondary)] hover:bg-[var(--ds-color-bg-2)]',
        danger:
          'bg-[var(--ds-color-danger)] text-white hover:opacity-90',
        outline:
          'border-2 border-[var(--ds-color-accent)] text-[var(--ds-color-accent)]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
