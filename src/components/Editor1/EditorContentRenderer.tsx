'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { FileText } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Callout } from './extensions/callout';
import { Embed } from './extensions/embed';
import { FontSize } from './extensions/font-size';
import { FontFamily } from './extensions/font-family';
import { detailsExtensions } from './extensions/details';
import { Math } from './extensions/math';

import './styles/index.scss';

const lowlight = createLowlight(common);

// Extensions for read-only rendering (without interactive features)
const renderExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: false,
    dropcursor: false,
    gapcursor: false,
  }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph', 'image'],
  }),
  Link.configure({
    openOnClick: true,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer',
      class: 'text-primary-600 hover:text-primary-700 underline underline-offset-2',
    },
  }),
  Image.configure({
    inline: false,
    HTMLAttributes: {
      class: 'rounded-xl shadow-md max-w-full h-auto',
      loading: 'lazy',
    },
  }),
  Table.configure({
    resizable: false,
    HTMLAttributes: {
      class: 'border-collapse w-full',
    },
  }),
  TableRow,
  TableCell.configure({
    HTMLAttributes: {
      class: 'border border-gray-200 dark:border-gray-700 p-3',
    },
  }),
  TableHeader.configure({
    HTMLAttributes: {
      class: 'border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 font-semibold',
    },
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Superscript,
  Subscript,
  CodeBlockLowlight.configure({
    lowlight,
  }),
  Callout,
  Embed,
  FontSize,
  FontFamily,
  ...detailsExtensions,
  Math,
];

interface EditorContentRendererProps {
  content: string | object;
  className?: string;
  prose?: boolean;
}

const EditorContentRenderer: React.FC<EditorContentRendererProps> = ({
  content,
  className = '',
  prose = true,
}) => {
  const contentRef = useRef(content);
  const initialLoadRef = useRef(false);

  // Parse content - پشتیبانی از JSON و HTML
  const parseContent = useCallback((rawContent: string | object | undefined): string | object | null => {
    if (!rawContent) return null;

    // اگر object است، مستقیم برگردان
    if (typeof rawContent !== 'string') {
      return rawContent;
    }

    const trimmed = rawContent.trim();
    if (!trimmed) return null;

    // اگر با < شروع می‌شود، HTML است
    if (trimmed.startsWith('<')) {
      return trimmed;
    }

    // اگر با { یا [ شروع می‌شود، JSON است
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        console.warn('Error parsing JSON content:', error);
        return trimmed;
      }
    }

    // در غیر این صورت، متن ساده است
    return trimmed;
  }, []);

  const parsedContent = useMemo(() => parseContent(content), [content, parseContent]);

  // Use TipTap editor in read-only mode.
  // کلاس‌های قبلی `prose prose-primary dark:prose-invert` در theme ما
  // تعریف نشده بود (Tailwind v4 prose plugin نصب نیست)؛ الان از همان
  // shell `at-prose at-prose--renderer` استفاده می‌کنیم تا با editor
  // و shell هماهنگ باشد.
  const editor = useEditor(
    {
      extensions: renderExtensions,
      content: parsedContent,
      editable: false,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: prose
            ? 'at-prose at-prose--renderer max-w-none focus:outline-none py-4 px-1'
            : 'py-4 px-1 focus:outline-none',
        },
      },
    },
    [],
  );

  // Update content when it changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    
    // جلوگیری از بارگذاری مجدد همان محتوا
    if (content === contentRef.current && initialLoadRef.current) return;
    
    contentRef.current = content;
    
    if (!initialLoadRef.current && parsedContent) {
      initialLoadRef.current = true;
      queueMicrotask(() => {
        if (!editor.isDestroyed) {
          editor.commands.setContent(parsedContent);
        }
      });
    }
  }, [editor, content, parsedContent]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!parsedContent) {
    return (
      <div className={`flex items-center justify-center py-8 text-gray-400 ${className}`}>
        <FileText className="w-8 h-8 ms-2" strokeWidth={1.5} aria-hidden />
        محتوایی برای نمایش وجود ندارد
      </div>
    );
  }

  if (!editor) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="me-3 text-gray-500">در حال بارگذاری...</span>
      </div>
    );
  }

  return (
    <div className={`editor-content-renderer ${className}`}>
      <EditorContent 
        editor={editor} 
        className="bg-transparent min-h-0 [&_.ProseMirror]:p-0 [&_.ProseMirror]:outline-none"
      />
    </div>
  );
};

export default EditorContentRenderer;
