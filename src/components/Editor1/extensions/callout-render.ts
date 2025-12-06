import { Node, mergeAttributes } from '@tiptap/core';

// Simple Callout extension for rendering (no React component needed)
export const CalloutRender = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
      },
      icon: {
        default: 'ℹ️',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes['data-type'] || 'info';
    const icon = HTMLAttributes['data-icon'] || 'ℹ️';

    const typeStyles: Record<string, string> = {
      info: 'background-color: #eff6ff; border-color: #3b82f6; color: #1e40af;',
      warning: 'background-color: #fefce8; border-color: #eab308; color: #854d0e;',
      success: 'background-color: #f0fdf4; border-color: #22c55e; color: #166534;',
      error: 'background-color: #fef2f2; border-color: #ef4444; color: #991b1b;',
    };

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        style: `${typeStyles[type] || typeStyles.info} padding: 1rem; border-radius: 0.5rem; border-right: 4px solid; margin: 1rem 0; display: flex; gap: 0.75rem;`,
      }),
      ['span', { style: 'font-size: 1.5rem;' }, icon],
      ['div', { style: 'flex: 1;' }, 0],
    ];
  },
});

export default CalloutRender;
