/**
 * PageBreak — Inkwell 2026
 * ----------------------------------------------------------------------------
 * یک node سفارشی برای درج «شکست صفحه» (page break) در ویرایشگر.
 *
 * چرا سفارشی؟
 *   StarterKit فقط `horizontalRule` دارد که <hr> رندر می‌کند. این برای
 *   جداکننده‌ی موضوعی کافی است ولی برای چاپ/PDF export نه. PageBreak یک
 *   <hr> با کلاس `at-page-break` رندر می‌کند که در print stylesheet به
 *   `page-break-after: always` تبدیل می‌شود.
 *
 * خروجی HTML:
 *   <hr class="at-page-break" data-type="page-break" />
 *
 * استفاده:
 *   - Toolbar: دکمه‌ی «شکست صفحه»
 *   - Slash menu: آیتم «شکست صفحه»
 *   - کیبورد: (اختیاری، بعداً) Mod+Enter
 * ----------------------------------------------------------------------------
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface PageBreakOptions {
  /** کلاس HTML برای <hr>. */
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * درج یک page break در موقعیت فعلی.
       */
      insertPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',

  group: 'block',

  // atom = یک واحد غیرقابل ویرایش (مثل تصویر)
  atom: true,

  // selectable = کاربر بتواند آن را select کند ولی نمی‌تواند محتوایش را ویرایش کند
  selectable: true,

  // draggable = بتوان آن را با dragHandle جابه‌جا کرد
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'hr[data-type="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'hr',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'page-break',
        class: 'at-page-break',
      }),
    ];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name }).run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // 2026-07-06: Mod+Enter را برای page break تنظیم نمی‌کنیم چون
      // در خیلی از editorها (Notion, Google Docs) این میان‌بر برای
      // ایجاد hard break (یا ارسال پیام) است. کاربر از طریق slash
      // menu یا toolbar دکمه‌ی اختصاصی دارد.
    };
  },
});

export default PageBreak;
