import { Extension } from '@tiptap/core';

export interface KeyboardShortcutsOptions {
  // Custom options if needed
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: 'customKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // Link shortcut - Ctrl/Cmd+K
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

      // Highlight shortcut - Ctrl/Cmd+Shift+H
      'Mod-Shift-h': () => {
        return this.editor.chain().focus().toggleHighlight().run();
      },

      // Strikethrough - Ctrl/Cmd+Shift+S
      'Mod-Shift-s': () => {
        return this.editor.chain().focus().toggleStrike().run();
      },

      // Code - Ctrl/Cmd+E
      'Mod-e': () => {
        return this.editor.chain().focus().toggleCode().run();
      },

      // Superscript - Ctrl/Cmd+.
      'Mod-.': () => {
        return this.editor.chain().focus().toggleSuperscript().run();
      },

      // Subscript - Ctrl/Cmd+,
      'Mod-,': () => {
        return this.editor.chain().focus().toggleSubscript().run();
      },
    };
  },
});

export default KeyboardShortcuts;
