'use client';

import { EditorContent, type EditorOptions, useEditor } from '@tiptap/react';
import React, { forwardRef, useEffect, useImperativeHandle, useCallback } from 'react';
import type { EditorInstance } from '.';
import FixedMenu from './components/fixed-menu';
import FloatingMenuComponent from './components/floating-menu';
import LinkBubbleMenu from './components/link-bubble-menu';
import TableContextMenu from './components/table-context-menu';
import TableToolbar from './components/table-toolbar';
import TextBubbleMenu from './components/text-bubble-menu';
import { extensions as builtInExtensions } from './extensions';
import { type TocItem, getToCItems } from './lib/table-of-contents';

import './styles/index.scss';

export interface EditorProps extends Partial<EditorOptions> {
  toolBarClassName?: string;
  wrapperClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  displayWordsCount?: boolean;
  onUpdateToC?: (items: TocItem[]) => void;
  localStorageKey: string;
}

export type EditorRef = {
  getEditor: () => EditorInstance | null;
};

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      wrapperClassName = '',
      toolBarClassName = '',
      contentClassName = '',
      footerClassName = '',
      extensions = [],
      editable = true,
      editorProps = {},
      content,
      displayWordsCount = true,
      onUpdateToC,
      localStorageKey,
      ...rest
    },
    ref,
  ) => {
    const editor = useEditor(
      {
        extensions: [...builtInExtensions, ...extensions],
        immediatelyRender: false,
        content,
        editorProps: {
          attributes: {
            class:
              'py-4 px-4 sm:py-6 sm:px-6 lg:py-8 lg:px-8 prose prose-sm sm:prose-base lg:prose-lg prose-primary prose-headings:scroll-mt-[80px] focus:outline-none',
          },
          ...editorProps,
        },
        ...rest,
      },
      [],
    );

    const getEditorInstance = useCallback(() => {
      if (!editor) {
        console.warn('Editor instance is not available');
        return null;
      }
      return editor;
    }, [editor]);

    useImperativeHandle(ref, () => ({
      getEditor: getEditorInstance,
    }));

    useEffect(() => {
      if (!editor || editor.isDestroyed || editor.isEditable === editable) return;

      // استفاده از setTimeout به جای queueMicrotask برای جلوگیری از flushSync error
      const timeoutId = setTimeout(() => {
        if (!editor.isDestroyed) {
          editor.setEditable(editable);
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }, [editable, editor]);

    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const items = getToCItems(editor);
      onUpdateToC?.(items);
    }, [editor, onUpdateToC]);

    // فقط ذخیره در localStorage، نه بارگذاری از آن
    // بارگذاری محتوا از prop content انجام می‌شود
    useEffect(() => {
      if (!editor || !localStorageKey) return;

      const saveContent = () => {
        localStorage.setItem(localStorageKey, JSON.stringify(editor.getJSON()));
      };

      editor.on('update', saveContent);

      return () => {
        editor.off('update', saveContent);
      };
    }, [editor, localStorageKey]);

    // تشخیص نوع محتوا و parse کردن آن
    const parseContent = useCallback(
      (rawContent: string | object | undefined): string | object | null => {
        if (!rawContent) return null;

        if (typeof rawContent !== 'string') {
          return rawContent;
        }

        const trimmed = rawContent.trim();
        if (!trimmed) return null;

        // اگر با < شروع شود، HTML است
        if (trimmed.startsWith('<')) {
          return trimmed;
        }

        // اگر با { یا [ شروع شود، JSON است
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            return JSON.parse(trimmed);
          } catch (error) {
            console.warn('Failed to parse content as JSON:', error);
            return trimmed;
          }
        }

        return trimmed;
      },
      [],
    );

    // بارگذاری محتوای اولیه - فقط یک بار وقتی ادیتور آماده شد
    const initialContentLoadedRef = React.useRef(false);
    const contentRef = React.useRef(content);

    useEffect(() => {
      // به‌روزرسانی ref برای مقایسه
      contentRef.current = content;
    }, [content]);

    useEffect(() => {
      if (!editor || editor.isDestroyed) return;

      // اگر قبلاً محتوا بارگذاری شده و محتوای جدید همان است، کاری نکن
      if (initialContentLoadedRef.current && content === contentRef.current) return;

      // فقط یک بار محتوا را بارگذاری کن
      if (!initialContentLoadedRef.current && content) {
        initialContentLoadedRef.current = true;
        const parsedContent = parseContent(content);
        if (parsedContent) {
          // استفاده از setTimeout به جای queueMicrotask برای جلوگیری از flushSync error
          const timeoutId = setTimeout(() => {
            if (!editor.isDestroyed) {
              editor.commands.setContent(parsedContent);
            }
          }, 0);

          return () => clearTimeout(timeoutId);
        }
      }
    }, [editor, content, parseContent]);

    useEffect(() => {
      return () => {
        editor?.destroy();
      };
    }, [editor]);

    if (!editor) return null;

    return (
      <div className={`bg-neutral-50 max-w-7xl mx-auto ${wrapperClassName}`}>
        {editable && (
          <div className="sticky top-0 z-10">
            <FixedMenu
              editor={editor}
              className={`bg-primary-100 border-b border-primary-200 p-2 sm:p-3 lg:p-4 ${toolBarClassName}`}
            />
          </div>
        )}
        <div className="rounded-lg shadow-md overflow-hidden">
          <LinkBubbleMenu editor={editor} />
          <TableContextMenu editor={editor} />
          <FloatingMenuComponent editor={editor} />
          <TextBubbleMenu editor={editor} />
          <TableToolbar editor={editor} />
          <EditorContent
            editor={editor}
            className={`bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] ${contentClassName}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          {editable && displayWordsCount && (
            <div
              className={`sticky bottom-0 text-xs sm:text-sm lg:text-base font-bold border-t border-primary-200 
                          bg-primary-50 text-primary-800 px-3 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4 text-right ${footerClassName}`}
            >
              {editor.storage.characterCount.words()} کلمه
            </div>
          )}
        </div>
      </div>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
