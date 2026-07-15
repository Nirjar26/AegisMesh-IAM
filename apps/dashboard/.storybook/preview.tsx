import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f4f6fb' },
        { name: 'dark', value: '#0f131b' },
      ],
    },
    a11y: {
      config: { rules: [{ id: 'color-contrast', enabled: true }] },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default preview;
