import { forwardRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface Tab {
  id: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-[var(--ds-color-border)]', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          disabled={tab.disabled}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors relative',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-color-accent)]',
            activeTab === tab.id
              ? 'text-[var(--ds-color-accent)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--ds-color-accent)]'
              : 'text-[var(--ds-color-text-muted)] hover:text-[var(--ds-color-text-primary)]',
            tab.disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
