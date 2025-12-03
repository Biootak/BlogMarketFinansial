import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import type { Editor } from '@tiptap/react';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
  keywords: string[];
  category: 'basic' | 'media' | 'advanced' | 'list';
}

export const defaultSlashCommands: SlashCommandItem[] = [
  // Basic blocks
  {
    title: 'متن',
    description: 'پاراگراف معمولی',
    icon: '📝',
    keywords: ['paragraph', 'text', 'متن', 'پاراگراف'],
    category: 'basic',
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'عنوان ۱',
    description: 'عنوان بزرگ',
    icon: 'H1',
    keywords: ['heading', 'h1', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'عنوان ۲',
    description: 'عنوان متوسط',
    icon: 'H2',
    keywords: ['heading', 'h2', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'عنوان ۳',
    description: 'عنوان کوچک',
    icon: 'H3',
    keywords: ['heading', 'h3', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'عنوان ۴',
    description: 'عنوان خیلی کوچک',
    icon: 'H4',
    keywords: ['heading', 'h4', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  // Lists
  {
    title: 'لیست نقطه‌ای',
    description: 'لیست با نقطه',
    icon: '•',
    keywords: ['bullet', 'list', 'لیست', 'نقطه'],
    category: 'list',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'لیست شماره‌ای',
    description: 'لیست با شماره',
    icon: '1.',
    keywords: ['numbered', 'list', 'لیست', 'شماره'],
    category: 'list',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'لیست وظایف',
    description: 'لیست با چک‌باکس',
    icon: '☑',
    keywords: ['task', 'todo', 'checkbox', 'وظیفه', 'چک'],
    category: 'list',
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  // Media
  {
    title: 'تصویر',
    description: 'درج تصویر',
    icon: '🖼️',
    keywords: ['image', 'picture', 'تصویر', 'عکس'],
    category: 'media',
    command: (editor) => {
      const url = window.prompt('آدرس تصویر را وارد کنید:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'ویدیو یوتیوب',
    description: 'جاسازی ویدیو از یوتیوب',
    icon: '▶️',
    keywords: ['youtube', 'video', 'ویدیو', 'یوتیوب'],
    category: 'media',
    command: (editor) => {
      const url = window.prompt('آدرس ویدیو یوتیوب را وارد کنید:');
      if (url) {
        editor.chain().focus().setEmbed({ src: url }).run();
      }
    },
  },
  // Advanced
  {
    title: 'نقل قول',
    description: 'بلاک نقل قول',
    icon: '❝',
    keywords: ['quote', 'blockquote', 'نقل قول'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'کد',
    description: 'بلاک کد',
    icon: '</>',
    keywords: ['code', 'codeblock', 'کد'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'جدول',
    description: 'درج جدول',
    icon: '▦',
    keywords: ['table', 'جدول'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'خط جداکننده',
    description: 'خط افقی',
    icon: '—',
    keywords: ['divider', 'hr', 'horizontal', 'خط', 'جداکننده'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  // Callouts
  {
    title: 'نکته',
    description: 'بلاک اطلاعات',
    icon: 'ℹ️',
    keywords: ['callout', 'info', 'نکته', 'اطلاعات'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'info' }).run(),
  },
  {
    title: 'هشدار',
    description: 'بلاک هشدار',
    icon: '⚠️',
    keywords: ['callout', 'warning', 'هشدار'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'warning' }).run(),
  },
  {
    title: 'موفقیت',
    description: 'بلاک موفقیت',
    icon: '✅',
    keywords: ['callout', 'success', 'موفقیت'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'success' }).run(),
  },
  {
    title: 'خطا',
    description: 'بلاک خطا',
    icon: '❌',
    keywords: ['callout', 'error', 'خطا'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'error' }).run(),
  },
  {
    title: 'آکاردئون',
    description: 'بلاک قابل باز و بسته شدن',
    icon: '📂',
    keywords: ['details', 'accordion', 'toggle', 'آکاردئون', 'جزئیات'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setDetails().run(),
  },
  {
    title: 'فرمول ریاضی',
    description: 'فرمول LaTeX',
    icon: '∑',
    keywords: ['math', 'latex', 'formula', 'equation', 'فرمول', 'ریاضی'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setMath().run(),
  },
];

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: any; props: SlashCommandItem }) => {
          props.command(editor);
          editor.chain().focus().deleteRange(range).run();
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommands;
