'use client';

import React, { useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
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
  }),
  Image.configure({
    inline: false,
  }),
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableCell,
  TableHeader,
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
];

interface EditorContentRendererProps {
  content: string | object;
  className?: string;
}

const EditorContentRenderer: React.FC<EditorContentRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  // Parse content
  const jsonContent = useMemo(() => {
    try {
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
      console.error('Error parsing content:', error);
      return null;
    }
  }, [content]);

  // Use TipTap editor in read-only mode
  const editor = useEditor({
    extensions: renderExtensions,
    content: jsonContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'py-4 px-4 prose prose-sm sm:prose-base lg:prose-lg prose-primary dark:prose-invert focus:outline-none',
      },
    },
  }, []);

  // Update content when it changes
  React.useEffect(() => {
    if (editor && jsonContent) {
      editor.commands.setContent(jsonContent);
    }
  }, [editor, jsonContent]);

  if (!jsonContent || typeof jsonContent !== 'object') {
    return <div className={className}>محتوا نامعتبر است</div>;
  }

  if (!editor) {
    return <div className={className}>در حال بارگذاری...</div>;
  }

  return (
    <div className={`editor-content-renderer ${className}`}>
      <EditorContent 
        editor={editor} 
        className="bg-transparent min-h-0 [&_.ProseMirror]:p-0"
      />
    </div>
  );
};

export default EditorContentRenderer;
