// Design token references for JS usage
// Actual values are in apps/dashboard/src/index.css as CSS variables
// This file provides TypeScript types and constants referencing them

export const tokens = {
  colors: {
    bg: ['var(--ds-color-bg-0)', 'var(--ds-color-bg-1)', 'var(--ds-color-bg-2)', 'var(--ds-color-bg-3)'],
    surface: 'var(--ds-color-surface)',
    border: 'var(--ds-color-border)',
    text: {
      primary: 'var(--ds-color-text-primary)',
      secondary: 'var(--ds-color-text-secondary)',
      muted: 'var(--ds-color-text-muted)',
    },
    accent: 'var(--ds-color-accent)',
    info: 'var(--ds-color-info)',
    success: 'var(--ds-color-success)',
    danger: 'var(--ds-color-danger)',
    warning: 'var(--ds-color-warning)',
  },
  spacing: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
} as const;
