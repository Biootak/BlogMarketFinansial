/**
 * Footnote — Inkwell 2026
 * ----------------------------------------------------------------------------
 * یک extension برای پاورقی (footnote / مرجع) در متن.
 *
 * معماری:
 *   - `footnoteRef` (Mark): یک شمارنده‌ی inline در متن. مثلاً `[1]`.
 *   - `footnote` (Node): یک بلاک جداگانه که متن پاورقی را نگه می‌دارد.
 *     در انتهای document رندر می‌شود (در یک container اختصاصی).
 *
 * استفاده:
 *   1) کاربر متنی را انتخاب می‌کند یا در نقطه‌ای از متن cursor دارد.
 *   2) دستور `insertFootnote` را صدا می‌زند (toolbar/slash menu).
 *   3) یک footnoteRef (شماره) در موقعیت فعلی درج می‌شود.
 *   4) یک node footnote در انتهای document اضافه می‌شود با یک paragraph
 *      خالی برای پر کردن متن پاورقی.
 *
 * محدودیت‌ها (نسخه‌ی اولیه):
 *   - شماره‌گذاری خودکار بر اساس ترتیب document.
 *   - اگر پاورقی‌ها حذف شوند، شماره‌ها به‌روز نمی‌شوند (نیاز به plugin).
 *   - فقط یک سطح پاورقی (نه تو در تو).
 *
 * مسیر آینده:
 *   - افزودن ProseMirror plugin برای auto-renumber
 *   - افزودن «hover preview» روی شماره در متن
 * ----------------------------------------------------------------------------
 */

import { InputRule, Mark, Node, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      /**
       * درج یک پاورقی در موقعیت فعلی.
       */
      insertFootnote: () => ReturnType;
    };
  }
}

export const FootnoteRef = Mark.create({
  name: 'footnoteRef',

  // mark روی inline text — با arrow keys می‌توان از آن خارج شد
  exitable: true,
  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-footnote-id'),
        renderHTML: (attrs) => {
          if (!attrs.id) return {};
          return {
            'data-footnote-id': String(attrs.id),
            id: `fnref-${String(attrs.id)}`,
          };
        },
      },
      number: {
        default: null,
        parseHTML: (el) => {
          const n = el.getAttribute('data-footnote-number');
          return n ? Number.parseInt(n, 10) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.number) return {};
          return { 'data-footnote-number': String(attrs.number) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote-ref]' }, { tag: 'a[href^="#fn-"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, {
        'data-footnote-ref': '',
        class: 'at-footnote-ref',
      }),
      [
        'a',
        { href: `#fn-${HTMLAttributes['data-footnote-id'] ?? ''}` },
        String(HTMLAttributes['data-footnote-number'] ?? ''),
      ],
    ];
  },

  addInputRules() {
    // [1] را به footnoteRef تبدیل نمی‌کنیم چون کاربر به‌صورت مستقیم
    // دکمه را می‌زند. در آینده اگر pattern رایج شد، اضافه می‌کنیم.
    return [];
  },
});

export const Footnote = Node.create({
  name: 'footnote',

  // یک گروه اختصاصی — در editor container با containerCSS جدا رندر می‌شود
  group: 'block',
  content: 'paragraph',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-footnote-id'),
        renderHTML: (attrs) => {
          if (!attrs.id) return {};
          return {
            'data-footnote-id': String(attrs.id),
            id: `fn-${String(attrs.id)}`,
          };
        },
      },
      number: {
        default: null,
        parseHTML: (el) => {
          const n = el.getAttribute('data-footnote-number');
          return n ? Number.parseInt(n, 10) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.number) return {};
          return { 'data-footnote-number': String(attrs.number) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-type="footnote"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'footnote',
        class: 'at-footnote',
      }),
      0, // content slot
    ];
  },

  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ chain, state }) => {
          // شماره = تعداد footnote‌های موجود + 1
          let count = 0;
          state.doc.descendants((node) => {
            if (node.type.name === 'footnote') count++;
          });
          const number = count + 1;
          const id = String(number);

          // 1) درج ref در موقعیت فعلی
          // 2) درج footnote node در انتهای document
          return chain()
            .insertContent({
              type: 'footnoteRef',
              attrs: { id, number },
            })
            .command(({ tr }) => {
              // اضافه کردن یک paragraph برای متن footnote در انتها
              const endPos = tr.doc.content.size;
              tr.insert(
                endPos,
                state.schema.nodes.footnote.create(
                  { id, number },
                  state.schema.nodes.paragraph.create(null, state.schema.text('متن پاورقی...')),
                ),
              );
              return true;
            })
            .run();
        },
    };
  },
});

export { FootnoteRef as default, Footnote as FootnoteNode };
