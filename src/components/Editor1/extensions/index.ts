import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

import slashCommandsSuggestion from '../lib/slash-commands-suggestion';
import { Callout } from './callout';
import CodeBlockLowlight from './code-block-lowlight/code-block-lowlight';
import { detailsExtensions } from './details';
import { DragHandle } from './drag-handle';
import { Embed } from './embed';
import { FontFamily } from './font-family';
import { FontSize } from './font-size';
import Heading from './heading';
import Image from './image-resize';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import Link from './link';
import { Math } from './math';
import { Mention, mentionSuggestion } from './mention';
import { Paragraph } from './paragraph';
import { SlashCommands } from './slash-commands';
import { tableExtensions } from './table';
import { taskExtensions } from './task-list';

export const extensions = [
  Image,
  StarterKit.configure({
    heading: false,
    // غیرفعال کردن paragraph پیش‌فرض برای استفاده از نسخه سفارشی
    paragraph: false,
    horizontalRule: {
      HTMLAttributes: {
        class: 'my-4 border-t-2 border-gray-300 dark:border-gray-600',
      },
    },
    codeBlock: false,
    // HardBreak فعال برای حفظ فاصله‌ها با Shift+Enter
    hardBreak: {
      keepMarks: true,
    },
    dropcursor: {},
  }),
  // Paragraph سفارشی برای حفظ پاراگراف‌های خالی
  Paragraph,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph', 'image'],
  }),
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Link.configure({
    openOnClick: false,
  }),
  Placeholder.configure({
    showOnlyWhenEditable: true,
    placeholder: 'متن مورد نظر خود را وارد کنید',
  }),
  CodeBlockLowlight,
  CharacterCount,
  ...tableExtensions,
  ...taskExtensions,
  SlashCommands.configure({
    suggestion: slashCommandsSuggestion,
  }),
  Callout,
  Embed,
  Superscript,
  Subscript,
  ...detailsExtensions,
  Math,
  Mention.configure({
    suggestion: mentionSuggestion,
  }),
  FontSize,
  FontFamily,
  DragHandle,
  KeyboardShortcuts,
];
