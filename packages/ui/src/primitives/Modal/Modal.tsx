import { type ReactNode, useEffect, useCallback, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

const modalVariants = cva(
  'bg-[var(--ds-color-surface)] rounded-[var(--radius-xl)] shadow-lg border border-[var(--ds-color-border)] w-full mx-auto',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface ModalProps extends VariantProps<typeof modalVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, children, footer, size, className }, ref) => {
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      },
      [onClose],
    );

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [open, handleEscape]);

    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div ref={ref} className={cn(modalVariants({ size }), className)}>
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ds-color-border)]">
              <h2 className="text-lg font-semibold text-[var(--ds-color-text-primary)]">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--ds-color-text-muted)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-1)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="px-6 py-4">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-[var(--ds-color-border)] flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  },
);
Modal.displayName = 'Modal';
