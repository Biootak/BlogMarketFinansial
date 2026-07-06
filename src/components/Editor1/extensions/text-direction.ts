/**
 * TextDirection — Inkwell 2026
 * ----------------------------------------------------------------------------
 * افزودن قابلیت تغییر جهت متن (RTL/LTR) برای پاراگراف‌های انتخاب‌شده.
 *
 * کاربرد:
 *   - متن فارسی پیش‌فرض RTL است.
 *   - برای پاراگراف‌هایی که شامل متن انگلیسی، نمادهای مالی، یا اعداد انگلیسی
 *     هستند (مثل "EPS ratio: 12.5x"), کاربر می‌تواند dir="ltr" تنظیم کند
 *     تا متن به‌درستی چیده شود.
 *
 * استراتژی:
 *   - `dir` را به‌صورت global attribute روی nodeهای block اضافه می‌کنیم.
 *   - مقادیر مجاز: 'rtl' (default)، 'ltr'.
 *   - اگر null باشد، direction از والد (معمولاً body) ارث می‌برد.
 *
 * چرا TextStyle + attr جدید؟
 *   - TextStyle فقط mark-level است، نه block-level.
 *   - با global attribute می‌توانیم dir را روی هر block اعمال کنیم.
 *
 * CSS:
 *   - در styles/text-direction.scss با `.at-dir-ltr` کلاس اضافه می‌شود.
 * ----------------------------------------------------------------------------
 */

import { Extension } from '@tiptap/core';

// 2026-07-06: نوع TextDirection با Tiptap built-in direction command
// سازگار است (شامل 'auto'). اگر 'auto' نبود، TypeScript با خطای
// 'Type "auto" is not assignable to type TextDirection' مواجه می‌شد.
export type TextDirection = 'auto' | 'rtl' | 'ltr' | null;

export interface TextDirectionOptions {
  /** آیا باید direction در heading‌ها هم قابل تغییر باشد؟ پیش‌فرض true. */
  applyToHeading: boolean;
  /** آیا باید در listItem اعمال شود؟ پیش‌فرض false (ساختار لیست حفظ شود). */
  applyToListItem: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textDirection: {
      /**
       * تنظیم direction پاراگراف فعلی.
       */
      setTextDirection: (dir: TextDirection) => ReturnType;
      /**
       * toggle: RTL → LTR یا LTR → RTL
       */
      toggleTextDirection: () => ReturnType;
    };
  }
}

const VALID_TYPES = ['paragraph', 'heading', 'blockquote', 'codeBlock', 'callout', 'details'];

export const TextDirection = Extension.create<Partial<TextDirectionOptions>>({
  name: 'textDirection',

  addOptions() {
    return {
      applyToHeading: true,
      applyToListItem: false,
    };
  },

  addGlobalAttributes() {
    return [
      {
        // 2026-07-06: dir فقط روی nodeهای block اعمال می‌شود.
        // paragraph + heading + quote + codeBlock + callout + details.
        // listItem مستثنی است چون ساختار لیست باید حفظ شود.
        types: VALID_TYPES,
        attributes: {
          dir: {
            default: null,
            parseHTML: (el) => {
              const dir = el.getAttribute('dir');
              if (dir === 'rtl' || dir === 'ltr') return dir;
              return null;
            },
            renderHTML: (attrs) => {
              if (attrs.dir === 'rtl' || attrs.dir === 'ltr') {
                return { dir: attrs.dir };
              }
              return {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (dir: TextDirection) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = state.selection;
          let modified = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!VALID_TYPES.includes(node.type.name)) return;
            const current = node.attrs.dir ?? null;
            if (current !== dir) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
              modified = true;
            }
          });
          return modified;
        },
      toggleTextDirection:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = state.selection;
          // تعیین direction فعلی از اولین node در selection
          let currentDir: TextDirection = null;
          state.doc.nodesBetween(from, to, (node) => {
            if (!VALID_TYPES.includes(node.type.name)) return;
            if (currentDir === null) {
              currentDir = (node.attrs.dir as TextDirection) ?? null;
            }
          });

          // toggle: null/rtl → ltr، ltr → rtl
          let newDir: TextDirection;
          if (currentDir === 'ltr') {
            newDir = 'rtl';
          } else {
            // null یا rtl → ltr (پیش‌فرض فارسی rtl است؛ اگر می‌خواهد ltr، صریح کنیم)
            newDir = 'ltr';
          }

          let modified = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!VALID_TYPES.includes(node.type.name)) return;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir: newDir });
            modified = true;
          });
          return modified;
        },
    };
  },

  addKeyboardShortcuts() {
    // 2026-07-06: کیبورد شورتکات اختصاصی نمی‌دهیم چون RTL/LTR یک
    // تنظیم کم‌کاربرد است. کاربر از toolbar یا slash menu استفاده می‌کند.
    return {};
  },
});

export default TextDirection;
