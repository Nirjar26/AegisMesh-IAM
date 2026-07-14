import type { ReactNode, ComponentType } from 'react';
import { LucideProps } from 'lucide-react';

interface CardShellProps {
    children: ReactNode;
    className?: string;
}

export function CardShell({ children, className = '' }: CardShellProps) {
    return (
        <div
            className={`bg-white border border-[var(--ds-color-border)] rounded-2xl shadow-sm overflow-hidden ${className}`}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    icon?: ComponentType<LucideProps>;
    title: string;
    right?: ReactNode;
}

export function CardHeader({ icon: Icon, title, right = null }: CardHeaderProps) {
    return (
        <div className="px-6 py-4 border-b border-[var(--ds-color-border)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgb(var(--ds-rgb-accent)/0.12)] text-[var(--ds-color-accent)] flex items-center justify-center">
                {Icon ? <Icon size={16} /> : null}
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">{title}</h3>
            <div className="ml-auto">{right}</div>
        </div>
    );
}

export default CardShell;
