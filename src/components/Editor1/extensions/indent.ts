/**
 * Indent — Inkwell 2026
 * ----------------------------------------------------------------------------
 * افزودن/کاهش تورفتگی برای پاراگراف‌ها و لیست‌ها.
 *
 * استراتژی:
 *   - از کلاس‌های CSS `indent-1` تا `indent-6` استفاده می‌کنیم
 *     (padding-inline-start با logical property برای RTL).
 *   - کلاس روی nodeهای paragraph, heading, listItem اعمال می‌شود.
 *   - Tab/Shift+Tab در editor به ترتیب indent/outdent می‌کنند.
 *
 * چرا نه از prose-indent (community)؟
 *   - آن plugin از `padding-left` استفاده می‌کند که RTL نمی‌شناسد.
 *   - نگه‌داری یک افزونه‌ی سفارشی کوچک ساده‌تر است.
 *
 * محدودیت‌ها:
 *   - فقط روی paragraph/heading اعمال می‌شود. ListItem تودرتو توسط
 *     StarterKit هندل می‌شود (Tab داخل لیست ساختار را عوض می‌کند).
 *   - حداکثر indent: 6 سطح (بیشتر از آن برای متن قابل خواندن نیست).
 * ----------------------------------------------------------------------------
 */

import { Extension } from '@tiptap/core';

const MAX_INDENT = 6;

function clamp(level: number): number {
  if (level < 0) return 0;
  if (level > MAX_INDENT) return MAX_INDENT;
  return level;
}

function getIndentLevel(node: any): number {
  const cls = (node?.attrs?.class ?? '') as string;
  const m = cls.match(/indent-(\d+)/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

function setIndentLevel(node: any, level: number): any {
  const newLevel = clamp(level);
  let cls = (node.attrs?.class ?? '') as string;
  // حذف indent- قبلی
  cls = cls.replace(/\bindent-\d+\b/g, '').trim();
  if (newLevel > 0) {
    cls = cls ? `${cls} indent-${newLevel}` : `indent-${newLevel}`;
  }
  return { ...node, attrs: { ...node.attrs, class: cls } };
}

export interface IndentOptions {
  /** حداکثر سطح تورفتگی. پیش‌فرض 6. */
  maxLevel: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /**
       * افزایش یک سطح تورفتگی برای selection فعلی.
       */
      indent: () => ReturnType;
      /**
       * کاهش یک سطح تورفتگی برای selection فعلی.
       */
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create<Partial<IndentOptions>>({
  name: 'indent',

  addOptions() {
    return {
      maxLevel: MAX_INDENT,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          // 2026-07-06: class به‌صورت global attribute اضافه شد تا
          // CSS های indent روی همه‌ی nodeهای block اعمال شود.
          // منطق indent در commands و keyboard shortcuts هندل می‌شود.
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = state.selection;
          let modified = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
            const current = getIndentLevel(node);
            const next = clamp(current + 1);
            if (next !== current) {
              tr.setNodeMarkup(pos, undefined, setIndentLevel(node, next).attrs);
              modified = true;
            }
          });
          return modified;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = state.selection;
          let modified = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
            const current = getIndentLevel(node);
            const next = clamp(current - 1);
            if (next !== current) {
              tr.setNodeMarkup(pos, undefined, setIndentLevel(node, next).attrs);
              modified = true;
            }
          });
          return modified;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // اگر selection در داخل list item باشد، اجازه بده StarterKit
        // ساختار لیست را handle کند (Tab در لیست = indent لیست).
        if (editor.isActive('listItem') || editor.isActive('taskItem')) {
          return false;
        }
        return editor.commands.indent();
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('listItem') || editor.isActive('taskItem')) {
          return false;
        }
        return editor.commands.outdent();
      },
    };
  },
});

export default Indent;
