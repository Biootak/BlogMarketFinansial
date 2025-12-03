'use client';

import React from 'react';
import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Highlighter, Link, Code, Strikethrough } from 'lucide-react';

interface TextBubbleMenuProps {
  editor: Editor;
}

const TextBubbleMenu: React.FC<TextBubbleMenuProps> = ({ editor }) => {
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      shouldShow={({ editor, state }) => {
        const { from, to } = state.selection;
        const hasSelection = from !== to;
        const isTextSelected = hasSelection && !editor.isActive('image') && !editor.isActive('embed');
        return isTextSelected;
      }}
    >
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('bold') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('italic') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('underline') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('strike') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('highlight') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Highlight (Ctrl+Shift+H)"
        >
          <Highlighter size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('code') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Inline Code"
        >
          <Code size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('link') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300'
          }`}
          title="Link (Ctrl+K)"
        >
          <Link size={16} />
        </button>
      </div>
    </BubbleMenu>
  );
};

export default TextBubbleMenu;
