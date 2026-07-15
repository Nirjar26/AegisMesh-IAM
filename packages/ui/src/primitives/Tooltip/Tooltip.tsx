import { type ReactNode, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const tooltipVariants = cva(
  'absolute z-50 px-2 py-1 text-xs rounded-[var(--radius-sm)] whitespace-nowrap pointer-events-none',
  {
    variants: {
      side: {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1',
      },
    },
    defaultVariants: { side: 'top' },
  },
);

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, side, children, className }: TooltipProps) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div
        role="tooltip"
        className={cn(
          tooltipVariants({ side }),
          'bg-[var(--ds-color-text-primary)] text-[var(--ds-color-surface)]',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          className,
        )}
      >
        {content}
      </div>
    </div>
  );
}
