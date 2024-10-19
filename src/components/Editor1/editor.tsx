'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { EditorContent, type EditorOptions, useEditor } from '@tiptap/react';
import { extensions as builtInExtensions } from './extensions';
import FixedMenu from './components/fixed-menu';
import LinkBubbleMenu from './components/link-bubble-menu';
import type { EditorInstance } from '.';
import { getToCItems, type TocItem } from './lib/table-of-contents';

import './styles/index.scss';

export interface EditorProps extends Partial<EditorOptions> {
  toolBarClassName?: string;
  wrapperClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  displayWordsCount?: boolean;
  onUpdateToC?: (items: TocItem[]) => void;
  localStorageKey: string;
  onContentChange?: (content: string) => void;
}

export type EditorRef = {
  getEditor: () => EditorInstance | null;
  clearLocalStorage: () => void;
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
      onContentChange,
      ...rest
    },
    ref,
  ) => {
    const editor = useEditor(
      {
        extensions: [...builtInExtensions, ...extensions],
        content,
        editorProps: {
          attributes: {
            class:
              'py-4 px-4 sm:py-6 sm:px-6 lg:py-8 lg:px-8 prose prose-sm sm:prose-base lg:prose-lg prose-primary prose-headings:scroll-mt-[80px] focus:outline-none',
          },
          ...editorProps,
        },
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          const savedData = localStorage.getItem(localStorageKey);
          const parsedData = savedData ? JSON.parse(savedData) : {};
          localStorage.setItem(localStorageKey, JSON.stringify({ ...parsedData, content: html }));
          onContentChange?.(html);
        },
        ...rest,
      },
      [content],
    );

    const getEditorInstance = useCallback(() => {
      if (!editor) {
        console.warn('Editor instance is not available');
        return null;
      }
      return editor;
    }, [editor]);

    const clearLocalStorage = useCallback(() => {
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        delete parsedData.content;
        localStorage.setItem(localStorageKey, JSON.stringify(parsedData));
      }
    }, [localStorageKey]);

    useImperativeHandle(ref, () => ({
      getEditor: getEditorInstance,
      clearLocalStorage,
    }));

    useEffect(() => {
      if (!editor || editor.isDestroyed || editor.isEditable === editable) return;
      queueMicrotask(() => editor.setEditable(editable));
    }, [editable, editor]);

    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const items = getToCItems(editor);
      onUpdateToC?.(items);
    }, [editor, onUpdateToC]);

    // Update editor content when `content` prop changes
    useEffect(() => {
      if (editor && content !== undefined && editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }, [editor, content]);

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
          <EditorContent
            editor={editor}
            className={`bg-white text-neutral-900 min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] ${contentClassName}`}
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
