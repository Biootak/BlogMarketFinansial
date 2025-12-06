import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MathBlock from '../components/math-block';

export interface MathOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      setMath: (attributes?: { latex?: string; displayMode?: boolean }) => ReturnType;
    };
  }
}

export const Math = Node.create<MathOptions>({
  name: 'math',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
      displayMode: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-display-mode') === 'true',
        renderHTML: (attributes) => ({
          'data-display-mode': attributes.displayMode ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-math]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-math': '' }),
    ];
  },

  addCommands() {
    return {
      setMath:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              latex: attributes?.latex || '',
              displayMode: attributes?.displayMode ?? true,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlock as any);
  },
});

export default Math;
