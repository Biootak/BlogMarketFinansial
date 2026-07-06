/**
 * KeyboardShortcuts — Inkwell 2026
 * ----------------------------------------------------------------------------
 * کیبورد شورتکات‌های سفارشی ادیتور. اینجا فقط شورتکات‌هایی را تعریف
 * می‌کنیم که پیش‌فرض Tiptap/ProseMirror ندارند یا می‌خواهیم override کنیم.
 *
 * شورتکات‌های پیش‌فرض ProseMirror که فعال هستند (نمونه):
 *   Mod-B       → Bold
 *   Mod-I       → Italic
 *   Mod-U       → Underline
 *   Mod-Z       → Undo
 *   Mod-Shift-Z → Redo
 *   Mod-`       → Inline code
 *   Mod-Alt-1..6 → Headings (H1-H6)
 *   Mod-Alt-0   → Paragraph
 *   Shift-Enter → Hard break
 *   Tab         → Indent list (در لیست)
 *   Backspace   → Unwrap list/blockquote
 *
 * شورتکات‌های سفارشی این extension:
 *   Mod-K       → درج/ویرایش لینک
 *   Mod-Shift-H → هایلایت
 *   Mod-Shift-S → خط‌خورده (Strikethrough)
 *   Mod-E       → کد درون‌خطی
 *   Mod-.       → Superscript
 *   Mod-,       → Subscript
 *   Mod-Shift-7 → Ordered list
 *   Mod-Shift-8 → Bullet list
 *   Mod-Shift-X → پاک کردن فرمت (Clear marks)
 *   Mod-Shift--- → Horizontal rule (خط جداکننده)
 * ----------------------------------------------------------------------------
 */

import { Extension } from '@tiptap/core';

export interface KeyboardShortcutsOptions {
  // Custom options if needed
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: 'customKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // ── Link: Ctrl/Cmd+K ──
      'Mod-k': () => {
        const previousUrl = this.editor.getAttributes('link').href;
        const url = window.prompt('آدرس لینک را وارد کنید:', previousUrl);

        if (url === null) {
          return false;
        }

        if (url === '') {
          return this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }

        return this.editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();
      },

      // ── Highlight: Ctrl/Cmd+Shift+H ──
      'Mod-Shift-h': () => {
        return this.editor.chain().focus().toggleHighlight().run();
      },

      // ── Strikethrough: Ctrl/Cmd+Shift+S ──
      'Mod-Shift-s': () => {
        return this.editor.chain().focus().toggleStrike().run();
      },

      // ── Inline code: Ctrl/Cmd+E ──
      // (ProseMirror پیش‌فرض Mod-` را دارد، اما Mod-E راحت‌تر است)
      'Mod-e': () => {
        return this.editor.chain().focus().toggleCode().run();
      },

      // ── Superscript: Ctrl/Cmd+. ──
      'Mod-.': () => {
        return this.editor.chain().focus().toggleSuperscript().run();
      },

      // ── Subscript: Ctrl/Cmd+, ──
      'Mod-,': () => {
        return this.editor.chain().focus().toggleSubscript().run();
      },

      // ── Ordered list: Ctrl/Cmd+Shift+7 ──
      'Mod-Shift-7': () => {
        return this.editor.chain().focus().toggleOrderedList().run();
      },

      // ── Bullet list: Ctrl/Cmd+Shift+8 ──
      'Mod-Shift-8': () => {
        return this.editor.chain().focus().toggleBulletList().run();
      },

      // ── Clear formatting: Ctrl/Cmd+Shift+X ──
      // از `unsetAllMarks()` استفاده می‌کنیم (built-in Tiptap) به جای
      // ۹ دستور جدا. این future-proof است — اگر extension جدیدی
      // mark اضافه کند، اینجا خودکار پاک می‌شود.
      'Mod-Shift-x': () => {
        return this.editor.chain().focus().unsetAllMarks().run();
      },

      // ── Horizontal rule: Ctrl/Cmd+Shift+Hyphen ──
      'Mod-Shift--': () => {
        return this.editor.chain().focus().setHorizontalRule().run();
      },
    };
  },
});

export default KeyboardShortcuts;
