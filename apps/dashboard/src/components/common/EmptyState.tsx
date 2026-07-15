import type { ComponentType } from 'react';
import { Plus, LucideProps } from 'lucide-react';

interface EmptyStateProps {
    icon: ComponentType<LucideProps>;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="py-16 flex flex-col items-center gap-3 text-center px-4 bg-white border border-[var(--ds-color-border)] rounded-[var(--radius-lg)] shadow-sm">
            <div className="bg-[var(--ds-color-bg-1)] rounded-2xl p-4 text-[var(--ds-color-text-muted)]">
                {Icon && <Icon size={32} />}
            </div>
            <p className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">{title}</p>
            <p className="text-[13px] text-[var(--ds-color-text-muted)]">{description}</p>
            {onAction && actionLabel && (
                <div className="flex gap-2 mt-2">
                    <button
                        type="button"
                        onClick={onAction}
                        className="bg-[var(--ds-color-accent)] hover:bg-[var(--ds-color-accent-strong)] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <Plus size={15} />
                        {actionLabel}
                    </button>
                </div>
            )}
        </div>
    );
}
