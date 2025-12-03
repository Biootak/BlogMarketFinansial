import { Paragraph as TiptapParagraph } from '@tiptap/extension-paragraph';

/**
 * Custom Paragraph extension that preserves empty paragraphs
 * by adding a special attribute to track intentional empty lines
 */
export const Paragraph = TiptapParagraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // اضافه کردن یک کاراکتر نامرئی برای حفظ پاراگراف‌های خالی
      'data-empty': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-empty'),
        renderHTML: (attributes) => {
          if (attributes['data-empty']) {
            return { 'data-empty': 'true' };
          }
          return {};
        },
      },
    };
  },

  // اضافه کردن یک فاصله نامرئی به پاراگراف‌های خالی برای حفظ آنها
  renderHTML({ HTMLAttributes }) {
    return ['p', HTMLAttributes, 0];
  },
});

export default Paragraph;
