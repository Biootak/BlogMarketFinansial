/**
 * @file render-content.ts — server-side rendering of Tiptap JSON content.
 *
 * Why this exists: the former client-side article renderer spun up a full
 * TipTap editor instance in the browser, which pulled the entire editor
 * runtime + lowlight + KaTeX into the client bundle (~800 KB on blog pages).
 * `@tiptap/html`'s `generateHTML()` serializes the same JSON through each
 * extension's static `renderHTML` rules — no editor, no ProseMirror view, no
 * hydration — so the article body can be SSR'd.
 *
 * IMPORTANT: this module must NOT import anything that drags in the client
 * editor runtime. The real `details`/`embed`/`math` extensions import
 * `@tiptap/react` (ReactNodeViewRenderer) at top level, which breaks the
 * server bundle. So this module re-declares renderer-only equivalents that
 * omit `addNodeView()` (never used during SSR) and the NodeView component
 * imports. Keep the `renderHTML` rules in sync with the originals.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { FontFamily } from './extensions/font-family';
import { FontSize } from './extensions/font-size';
import { Footnote, FootnoteRef } from './extensions/footnote';

// Read-only Mention renderer — same lightweight node as the client one; only
// renders <span data-mention>, no suggestion popup.
const MentionReadOnly = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-mention]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-mention': '',
        class: 'mention',
        'data-label': node.attrs.label as string,
      }),
      `@${node.attrs.label}`,
    ];
  },
});

// ── Renderer-only Callout (mirror of extensions/callout.ts, no NodeView) ──
const Callout = Node.create({
  name: 'callout',
  addOptions() {
    return {
      types: ['info', 'warning', 'success', 'error'],
      defaultType: 'info',
      defaultIcon: 'Info',
      HTMLAttributes: {},
    };
  },
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      type: {
        default: this.options.defaultType,
        parseHTML: (element) => element.getAttribute('data-type') || this.options.defaultType,
        renderHTML: (attributes) => ({ 'data-type': attributes.type }),
      },
      icon: {
        default: this.options.defaultIcon,
        parseHTML: (element) => element.getAttribute('data-icon') || this.options.defaultIcon,
        renderHTML: (attributes) => ({ 'data-icon': attributes.icon }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-callout': '' }),
      0,
    ];
  },
});

// ── Renderer-only Details (mirror of extensions/details.ts, no NodeView) ──
const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'detailsSummary detailsContent',
  defining: true,
  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => {
          if (!attributes.open) return {};
          return { open: '' };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'details' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes({}, HTMLAttributes), 0];
  },
});
const DetailsSummary = Node.create({
  name: 'detailsSummary',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'summary' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0];
  },
});
const DetailsContent = Node.create({
  name: 'detailsContent',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-details-content]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-details-content': '' }), 0];
  },
});

// ── Renderer-only Embed (mirror of extensions/embed.ts, no NodeView) ──────
const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      provider: { default: 'generic' },
      embedId: { default: null },
      width: { default: '100%' },
      height: { default: 315 },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-embed]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-embed': '' })];
  },
});

// ── Renderer-only Math (mirror of extensions/math.ts, no NodeView) ────────
const MathRenderer = Node.create({
  name: 'math',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => ({ 'data-latex': attributes.latex }),
      },
      displayMode: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-display-mode') === 'true',
        renderHTML: (attributes) => ({
          'data-display-mode': attributes.displayMode ? 'true' : 'false',
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-math]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-math': '' })];
  },
});

const lowlight = createLowlight(common);

/** Extensions used to serialize stored Tiptap JSON to static HTML. */
export const renderExtensions = [
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
      class:
        'border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 font-semibold',
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
  Details,
  DetailsSummary,
  DetailsContent,
  MathRenderer,
  Footnote,
  FootnoteRef,
  MentionReadOnly,
];
