import {
  AIHighlight,
  CharacterCount,
  CodeBlockLowlight,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  HighlightExtension,
  HorizontalRule,
  MarkdownExtension,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  Twitter,
  UpdatedImage,
  Youtube,
  Mathematics,
} from 'novel/extensions';
import { UploadImagesPlugin } from 'novel/plugins';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import { common, createLowlight } from 'lowlight';
import { cn } from '@/lib/utils';

const aiHighlight = AIHighlight;

const placeholder = Placeholder.configure({
  placeholder: 'متن خود را اینجا بنویسید...',
});

const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cn(
      'text-primary-500 underline underline-offset-[3px] hover:text-primary-600 transition-colors cursor-pointer',
    ),
  },
});

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      UploadImagesPlugin({
        imageClass: cn('opacity-40 rounded-lg border border-neutral-200 dark:border-neutral-800'),
      }),
    ];
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: cn('rounded-lg border border-neutral-200 dark:border-neutral-800'),
  },
});

const textAlign = TextAlign.configure({
  types: ['heading', 'paragraph'],
  alignments: ['left', 'center', 'right'],
  defaultAlignment: 'left',
});

const table = Table.configure({
  resizable: true,
  HTMLAttributes: {
    class: cn('border-collapse table-auto w-full'),
  },
});

const tableRow = TableRow.configure({
  HTMLAttributes: {
    class: cn('border-b border-neutral-200 dark:border-neutral-800'),
  },
});

const tableHeader = TableHeader.configure({
  HTMLAttributes: {
    class: cn(
      'border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2 text-right font-bold',
    ),
  },
});

const tableCell = TableCell.configure({
  HTMLAttributes: {
    class: cn('p-2 border-l border-neutral-200 dark:border-neutral-800'),
  },
});

const updatedImage = UpdatedImage.configure({
  HTMLAttributes: {
    class: cn('rounded-lg border border-neutral-200 dark:border-neutral-800'),
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cn('not-prose pr-2'),
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: cn('flex gap-2 items-start my-4'),
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cn('mt-4 mb-6 border-t border-neutral-300 dark:border-neutral-700'),
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cn('list-disc list-outside leading-3 -mt-2 pr-4'),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cn('list-decimal list-outside leading-3 -mt-2 pr-4'),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cn('leading-normal -mb-2'),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cn('border-r-4 border-primary-500 pr-4'),
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: cn(
        'rounded-md bg-neutral-100 text-neutral-800 border p-5 font-mono font-medium dark:bg-neutral-900 dark:text-neutral-200',
      ),
    },
  },
  code: {
    HTMLAttributes: {
      class: cn('rounded-md bg-neutral-100 px-1.5 py-1 font-mono font-medium dark:bg-neutral-900'),
      spellcheck: 'false',
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: 'var(--c-primary-500)',
    width: 4,
  },
  gapcursor: false,
});

const codeBlockLowlight = CodeBlockLowlight.configure({
  lowlight: createLowlight(common),
});

const youtube = Youtube.configure({
  HTMLAttributes: {
    class: cn('rounded-lg border border-neutral-200 dark:border-neutral-800'),
  },
  inline: false,
});

const twitter = Twitter.configure({
  HTMLAttributes: {
    class: cn('not-prose'),
  },
  inline: false,
});

const mathematics = Mathematics.configure({
  HTMLAttributes: {
    class: cn(
      'text-neutral-800 rounded p-1 hover:bg-neutral-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-800',
    ),
  },
  katexOptions: {
    throwOnError: false,
  },
});

const characterCount = CharacterCount.configure();

export const defaultExtensions = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  updatedImage,
  taskList,
  taskItem,
  horizontalRule,
  aiHighlight,
  codeBlockLowlight,
  youtube,
  twitter,
  mathematics,
  characterCount,
  TiptapUnderline,
  MarkdownExtension,
  HighlightExtension,
  TextStyle,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  textAlign,
  table,
  tableRow,
  tableHeader,
  tableCell,
];
