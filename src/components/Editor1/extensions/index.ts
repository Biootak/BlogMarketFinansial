import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';

import Link from './link';
import Image from './image-resize';
import CodeBlockLowlight from './code-block-lowlight/code-block-lowlight';
import Heading from './heading';
import { tableExtensions } from './table';
import { taskExtensions } from './task-list';
import { SlashCommands } from './slash-commands';
import slashCommandsSuggestion from '../lib/slash-commands-suggestion';
import { Callout } from './callout';
import { Embed } from './embed';
import { detailsExtensions } from './details';
import { Math } from './math';
import { Mention, mentionSuggestion } from './mention';
import { FontSize } from './font-size';
import { FontFamily } from './font-family';
import { DragHandle } from './drag-handle';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { Paragraph } from './paragraph';

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
