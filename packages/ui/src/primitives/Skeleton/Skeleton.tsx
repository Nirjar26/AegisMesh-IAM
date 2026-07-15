import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const skeletonVariants = cva(
  'animate-pulse bg-[var(--ds-color-bg-2)] rounded-[var(--radius-sm)]',
  {
    variants: {
      variant: {
        text: 'h-4 w-full',
        circle: 'rounded-full',
        card: 'h-32 w-full rounded-[var(--radius-lg)]',
        avatar: 'rounded-full h-10 w-10',
      },
    },
    defaultVariants: { variant: 'text' },
  },
);

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  count?: number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, count = 1, ...props }, ref) => {
    if (count === 1) {
      return (
        <div
          ref={ref}
          className={cn(skeletonVariants({ variant }), className)}
          aria-busy="true"
          {...props}
        />
      );
    }
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(skeletonVariants({ variant }), className)}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  },
);
Skeleton.displayName = 'Skeleton';
