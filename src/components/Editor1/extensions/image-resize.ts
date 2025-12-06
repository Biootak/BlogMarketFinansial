import { ReactNodeViewRenderer } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';
import { Image as BaseImage } from '@tiptap/extension-image';
import ResizeImage from '../components/resize-image';
import RenderImage from '../components/render-image';

export default BaseImage.extend({
  addOptions() {
    return {
      ...this.parent?.(),
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
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width') || element.style.width;
          if (!width) return null;
          // Parse both pixel and percentage values
          if (width.includes('%')) {
            return width;
          }
          const numValue = Number.parseInt(width, 10);
          return Number.isNaN(numValue) ? null : numValue;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          const width = typeof attributes.width === 'number' 
            ? `${attributes.width}px` 
            : attributes.width;
          return { width, style: `width: ${width}` };
        },
      },
      alt: {
        default: undefined,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
      title: {
        default: undefined,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => ({
          title: attributes.title,
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
      rotation: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute('data-rotation')) || 0,
        renderHTML: (attributes) => ({
          'data-rotation': attributes.rotation,
        }),
      },
      filter: {
        default: 'none',
        parseHTML: (element) => element.getAttribute('data-filter') || 'none',
        renderHTML: (attributes) => ({
          'data-filter': attributes.filter,
        }),
      },
      opacity: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute('data-opacity')) || 100,
        renderHTML: (attributes) => ({
          'data-opacity': attributes.opacity,
        }),
      },
      borderRadius: {
        default: 12,
        parseHTML: (element) => Number(element.getAttribute('data-border-radius')) || 12,
        renderHTML: (attributes) => ({
          'data-border-radius': attributes.borderRadius,
        }),
      },
      shadow: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-shadow') === 'true',
        renderHTML: (attributes) => ({
          'data-shadow': attributes.shadow,
        }),
      },
      caption: {
        default: undefined,
        parseHTML: (element) => element.getAttribute('data-caption'),
        renderHTML: (attributes) => ({
          'data-caption': attributes.caption,
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
    return ReactNodeViewRenderer((this.editor.isEditable ? ResizeImage : RenderImage) as any);
  },
});
