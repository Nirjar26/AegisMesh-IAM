import { useState, forwardRef, type ImgHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const avatarVariants = cva('relative inline-flex items-center justify-center rounded-full overflow-hidden bg-[var(--ds-color-bg-2)]', {
  variants: {
    size: {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface AvatarProps
  extends ImgHTMLAttributes<HTMLImageElement>,
    VariantProps<typeof avatarVariants> {
  name?: string;
  fallback?: string;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, src, name, fallback, alt, ...props }, ref) => {
    const [error, setError] = useState(false);
    const showImage = src && !error;

    return (
      <span ref={ref} className={cn(avatarVariants({ size }), className)} role="img" aria-label={alt || name || 'Avatar'}>
        {showImage ? (
          <img
            src={src}
            alt={alt || name || ''}
            onError={() => setError(true)}
            className="h-full w-full object-cover"
            {...props}
          />
        ) : (
          <span className="font-medium text-[var(--ds-color-text-muted)]">
            {fallback || getInitials(name)}
          </span>
        )}
      </span>
    );
  },
);
Avatar.displayName = 'Avatar';
