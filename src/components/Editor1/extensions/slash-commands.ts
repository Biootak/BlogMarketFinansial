import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { LucideIcon } from 'lucide-react';
import {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Image as ImageIcon,
  Play,
  Quote,
  Code2,
  Table,
  Minus,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Sigma,
} from 'lucide-react';

// کلید یکتا برای پلاگین slash commands
export const slashCommandsPluginKey = new PluginKey('slashCommands');

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  command: (editor: Editor) => void;
  keywords: string[];
  category: 'basic' | 'media' | 'advanced' | 'list';
}

export const defaultSlashCommands: SlashCommandItem[] = [
  // Basic blocks
  {
    title: 'متن',
    description: 'پاراگراف معمولی',
    icon: Pilcrow,
    keywords: ['paragraph', 'text', 'متن', 'پاراگراف'],
    category: 'basic',
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'عنوان ۱',
    description: 'عنوان بزرگ',
    icon: Heading1,
    keywords: ['heading', 'h1', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'عنوان ۲',
    description: 'عنوان متوسط',
    icon: Heading2,
    keywords: ['heading', 'h2', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'عنوان ۳',
    description: 'عنوان کوچک',
    icon: Heading3,
    keywords: ['heading', 'h3', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'عنوان ۴',
    description: 'عنوان خیلی کوچک',
    icon: Heading4,
    keywords: ['heading', 'h4', 'عنوان', 'تیتر'],
    category: 'basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  // Lists
  {
    title: 'لیست نقطه‌ای',
    description: 'لیست با نقطه',
    icon: List,
    keywords: ['bullet', 'list', 'لیست', 'نقطه'],
    category: 'list',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'لیست شماره‌ای',
    description: 'لیست با شماره',
    icon: ListOrdered,
    keywords: ['numbered', 'list', 'لیست', 'شماره'],
    category: 'list',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'لیست وظایف',
    description: 'لیست با چک‌باکس',
    icon: CheckSquare,
    keywords: ['task', 'todo', 'checkbox', 'وظیفه', 'چک'],
    category: 'list',
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  // Media
  {
    title: 'تصویر',
    description: 'درج تصویر',
    icon: ImageIcon,
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
    icon: Play,
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
    icon: Quote,
    keywords: ['quote', 'blockquote', 'نقل قول'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'کد',
    description: 'بلاک کد',
    icon: Code2,
    keywords: ['code', 'codeblock', 'کد'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'جدول',
    description: 'درج جدول',
    icon: Table,
    keywords: ['table', 'جدول'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'خط جداکننده',
    description: 'خط افقی',
    icon: Minus,
    keywords: ['divider', 'hr', 'horizontal', 'خط', 'جداکننده'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  // Callouts
  {
    title: 'نکته',
    description: 'بلاک اطلاعات',
    icon: Info,
    keywords: ['callout', 'info', 'نکته', 'اطلاعات'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'info' }).run(),
  },
  {
    title: 'هشدار',
    description: 'بلاک هشدار',
    icon: AlertTriangle,
    keywords: ['callout', 'warning', 'هشدار'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'warning' }).run(),
  },
  {
    title: 'موفقیت',
    description: 'بلاک موفقیت',
    icon: CheckCircle2,
    keywords: ['callout', 'success', 'موفقیت'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'success' }).run(),
  },
  {
    title: 'خطا',
    description: 'بلاک خطا',
    icon: XCircle,
    keywords: ['callout', 'error', 'خطا'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setCallout({ type: 'error' }).run(),
  },
  {
    title: 'آکاردئون',
    description: 'بلاک قابل باز و بسته شدن',
    icon: FolderOpen,
    keywords: ['details', 'accordion', 'toggle', 'آکاردئون', 'جزئیات'],
    category: 'advanced',
    command: (editor) => editor.chain().focus().setDetails().run(),
  },
  {
    title: 'فرمول ریاضی',
    description: 'فرمول LaTeX',
    icon: Sigma,
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
        pluginKey: slashCommandsPluginKey,

        command: ({ editor, range, props }: { editor: Editor; range: any; props: SlashCommandItem }) => {
          // 2026-07-05: ابتدا اسلش و query را حذف می‌کنیم، سپس دستور انتخاب‌شده
          // را روی ویرایشگر تمیز اجرا می‌کنیم. اگر هر دو را در یک chain یا برعکس
          // اجرا کنیم، دستور داخلی روی متنی که هنوز اسلش دارد کار می‌کند و
          // کاراکتر / باقی می‌ماند.
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: slashCommandsPluginKey,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommands;
