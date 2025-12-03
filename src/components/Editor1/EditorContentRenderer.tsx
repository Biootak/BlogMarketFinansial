'use client';

import React from 'react';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { CalloutRender } from './extensions/callout-render';
import { EmbedRender } from './extensions/embed-render';

import './styles/index.scss';

const lowlight = createLowlight(common);

// Extensions for rendering (without interactive features)
const renderExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: false,
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
  CalloutRender,
  EmbedRender,
];

interface EditorContentRendererProps {
  content: string | object;
  className?: string;
}

const EditorContentRenderer: React.FC<EditorContentRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  // Parse content if it's a string
  const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;

  // Generate HTML from TipTap JSON
  const html = generateHTML(jsonContent, renderExtensions);

  return (
    <div 
      className={`ProseMirror prose lg:prose-lg dark:prose-invert max-w-none ${className}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: TipTap content is sanitized
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default EditorContentRenderer;
