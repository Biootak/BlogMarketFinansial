'use client';

import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Check,
  Code,
  Highlighter,
  Italic,
  Link,
  Strikethrough,
  Underline,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TextBubbleMenuProps {
  editor: Editor;
}

const TextBubbleMenu: React.FC<TextBubbleMenuProps> = ({ editor }) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [showLinkInput]);

  const handleLinkClick = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      // اضافه کردن پروتکل اگر وجود نداشت
      let finalUrl = linkUrl.trim();
      if (
        finalUrl &&
        !finalUrl.match(/^https?:\/\//i) &&
        !finalUrl.startsWith('/') &&
        !finalUrl.startsWith('#')
      ) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    setShowLinkInput(false);
    setLinkUrl('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyLink();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelLink();
      }
    },
    [applyLink, cancelLink],
  );

  // بررسی وضعیت فعال بودن هر فرمت
  const activeStates = useMemo(
    () => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      highlight: editor.isActive('highlight'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
    }),
    [editor.state.selection],
  );

  // کلاس‌های مشترک برای دکمه‌ها
  const getButtonClass = useCallback((isActive: boolean) => {
    return `p-2 rounded-lg transition-all duration-150 ${
      isActive
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
    }`;
  }, []);

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 150,
        animation: 'shift-away',
        moveTransition: 'transform 0.15s ease-out',
      }}
      shouldShow={({ editor, state }) => {
        const { from, to } = state.selection;
        const hasSelection = from !== to;
        const isTextSelected =
          hasSelection &&
          !editor.isActive('image') &&
          !editor.isActive('embed') &&
          !editor.isActive('table') &&
          !editor.isActive('codeBlock');
        return isTextSelected;
      }}
    >
      <div
        className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5"
        role="toolbar"
        aria-label="ابزار فرمت‌بندی متن"
      >
        {showLinkInput ? (
          <div className="flex items-center gap-2 px-2">
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="example.com"
              className="w-52 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              dir="ltr"
              aria-label="آدرس لینک"
            />
            <button
              type="button"
              onClick={applyLink}
              aria-label="تایید لینک"
              className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={cancelLink}
              aria-label="لغو"
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold (Ctrl+B)"
              aria-pressed={activeStates.bold}
              className={getButtonClass(activeStates.bold)}
            >
              <Bold size={16} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic (Ctrl+I)"
              aria-pressed={activeStates.italic}
              className={getButtonClass(activeStates.italic)}
            >
              <Italic size={16} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Underline (Ctrl+U)"
              aria-pressed={activeStates.underline}
              className={getButtonClass(activeStates.underline)}
            >
              <Underline size={16} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label="خط‌خورده (Ctrl+Shift+S)"
              aria-pressed={activeStates.strike}
              className={getButtonClass(activeStates.strike)}
            >
              <Strikethrough size={16} />
            </button>

            <div
              className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"
              role="separator"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              aria-label="هایلایت (Ctrl+Shift+H)"
              aria-pressed={activeStates.highlight}
              className={getButtonClass(activeStates.highlight)}
            >
              <Highlighter size={16} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="کد درون‌خطی (Ctrl+E)"
              aria-pressed={activeStates.code}
              className={getButtonClass(activeStates.code)}
            >
              <Code size={16} />
            </button>

            <div
              className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"
              role="separator"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={handleLinkClick}
              aria-label="لینک (Ctrl+K)"
              aria-pressed={activeStates.link}
              className={getButtonClass(activeStates.link)}
            >
              <Link size={16} />
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
};

export default TextBubbleMenu;
