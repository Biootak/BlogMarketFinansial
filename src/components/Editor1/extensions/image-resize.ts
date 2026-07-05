import { ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import { mergeAttributes } from '@tiptap/core';
import { Image as BaseImage } from '@tiptap/extension-image';
import ResizeImage from '../components/resize-image';

export default BaseImage.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
      group: 'block',
      defining: true,
      isolating: true,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      width: {
        default: '100%',
      },
      alt: {
        default: undefined,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
      textAlign: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-text-align') || element.style.textAlign || 'center',
        renderHTML: (attributes) => ({
          'data-text-align': attributes.textAlign,
          style: `text-align: ${attributes.textAlign}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    // biome-ignore lint/suspicious/noExplicitAny: TipTap React 19 compatibility
    return ReactNodeViewRenderer(ResizeImage as any);
  },
});
