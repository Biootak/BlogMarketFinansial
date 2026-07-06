import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import Gapcursor from '@tiptap/extension-gapcursor';
import Typography from '@tiptap/extension-typography';
import UniqueID from '@tiptap/extension-unique-id';
import { FileHandler } from '@tiptap/extension-file-handler';
// 2026-07-06: Focus — هایلایت خودکار block جاری با کلاس `.has-focus`.
// جایگزین `markActiveBlock` دستی در editor.tsx که با DOM querySelector
// کار می‌کرد. Focus از ProseMirror plugin داخلی استفاده می‌کند و
// performance بهتری دارد:
//   - بدون DOM mutation observer (lightweight)
//   - فقط به deep-most node کلاس می‌دهد (mode: 'deepest')
//   - هم در render و هم در selectionUpdate به‌روز می‌شود
import Focus from '@tiptap/extension-focus';
// 2026-07-06: Youtube — Embed رسمی YouTube با پشتیبانی از:
//   - nocookie mode (حریم خصوصی)
//   - controls / autoplay / loop
//   - paste自動 تشخیص URL
// هم‌زمان با custom Embed کار می‌کند (Embed دیگر YouTube را
// پردازش نمی‌کند — فقط Twitter/X + Vimeo).
import Youtube from '@tiptap/extension-youtube';

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
import { PageBreak } from './page-break';
import { Indent } from './indent';
import { Footnote, FootnoteRef } from './footnote';
import { TextDirection } from './text-direction';

export const extensions = [
  Image,
  StarterKit.configure({
    heading: false,
    // غیرفعال کردن paragraph پیش‌فرض برای استفاده از نسخه سفارشی
    paragraph: false,
    // link و underline به صورت جداگانه و با تنظیمات اختصاصی اضافه می‌شوند.
    link: false,
    underline: false,
    // 2026-07-06: StarterKit به‌صورت پیش‌فرض Gapcursor را هم شامل
    // می‌شود. چون در پایین explicit ثبتش می‌کنیم (با intent روشن
    // برای ثبات رفتاری)، اینجا disable می‌کنیم تا warning
    // `Duplicate extension names: ['gapCursor']` در کنسول ظاهر نشود.
    gapcursor: false,
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
  // 2026-07-06: Focus — هایلایت self-contained block جاری.
  //
  // mode: 'deepest' = فقط deepest node در selection کلاس می‌گیرد، نه
  // همه ancestorها. این یعنی وقتی cursor داخل یک پاراگراف در لیست است،
  // فقط آن پاراگراف هایلایت می‌شود، نه کل لیست. حس «تمرکز» بهتری
  // به نویسنده می‌دهد.
  //
  // className سفارشی `has-focus` را به‌جای پیش‌فرض `has-focus` نگه
  // می‌داریم چون با کلاس‌های CSS موجود (data-active) هماهنگ است.
  //
  // نکته: قبلاً این ویژگی با `markActiveBlock` دستی در editor.tsx
  // پیاده‌سازی می‌شد (querySelectorAll + setAttribute). Focus از یک
  // ProseMirror Decoration استفاده می‌کند که:
  //   1. از DOM mutation مستقل است (پایدارتر)
  //   2. در undo/redo history تأثیری ندارد
  //   3. با هر selectionUpdate خودکار به‌روز می‌شود
  Focus.configure({
    className: 'has-focus',
    mode: 'deepest',
  }),
  // 2026-07-06: Youtube Extension رسمی — با paste detection.
  //
  // nocookie=true: از domain youtube-nocookie.com استفاده می‌کند
  //   که کوکی tracking نمی‌گذارد.
  //
  // width: 100% + aspect-ratio CSS در embed.scss به‌جای fixed size.
  //   قبلاً Embed extension یوتیوب را خودش هندل می‌کرد؛ حالا این
  //   extension رسمی این کار را بهتر انجام می‌دهد (کنترل پلیر واقعی،
  //   responsiveness, autoplay config).
  //
  // هماهنگی با Embed:
  //   - Embed extension دیگر YouTube را در urlPatterns و pasteRules
  //     ندارد (در extensions/embed.ts اصلاح شده).
  //   - Embed فقط Twitter/X و Vimeo را هندل می‌کند.
  Youtube.configure({
    inline: false,
    width: 640,
    height: 390,
    nocookie: true,
    controls: true,
    modestBranding: true,
  }),
  // 2026-07-06: Placeholder — متن راهنمای context-aware.
  //
  // استراتژی: فقط block جاری placeholder نشون بده (showOnlyCurrent: true).
  // placeholder پاراگراف رو خالی گذاشتیم چون بنر بالایی (Deck hint)
  // و SlashCommands خودشون راهنما رو نشون میدن — تکرار اضافی است.
  // placeholder فقط برای heading و codeBlock مفیده چون حس "چه
  // بنویسم" رو زودتر رفع میکنه.
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') return 'عنوان...';
      if (node.type.name === 'codeBlock') return 'کد...';
      return '';
    },
    showOnlyWhenEditable: true,
    showOnlyCurrent: true,
  }),
  Gapcursor,
  // 2026-07-06: PageBreak سفارشی — برای چاپ/PDF export.
  // node «pageBreak» یک <hr data-type="page-break"> رندر می‌کند
  // که در print stylesheet به page-break-after: always تبدیل می‌شود.
  PageBreak,
  // 2026-07-06: Indent — Tab/Shift+Tab برای paragraph/heading.
  // کلاس‌های CSS `indent-1..6` (RTL-safe با logical property).
  Indent,
  // 2026-07-06: Footnote — پاورقی با ارجاع در متن.
  // FootnoteRef (mark) شماره‌ی superscript در متن.
  // Footnote (node) متن پاورقی را در انتهای document نگه می‌دارد.
  Footnote,
  FootnoteRef,
  // 2026-07-06: TextDirection — dir attribute روی block-level node.
  // برای پاراگراف‌های مخلوط فارسی/انگلیسی (نمادهای مالی، اعداد).
  TextDirection,
  Typography.configure({
    // 2026-07-06: کوتیشن‌های استاندارد فارسی/انگلیسی.
    // در متن فارسی معمولاً از «» استفاده می‌شود اما Tiptap Typography
    // این را پشتیبانی نمی‌کند. در عوض smart quotes استاندارد را تنظیم
    // می‌کنیم که برای نقل‌قول انگلیسی درون متن فارسی هم کافی است.
    // اگه روزی نیاز به «» در Persian Typography شد، باید extension
    // سفارشی بنویسیم.
    openDoubleQuote: '“',
    closeDoubleQuote: '”',
    openSingleQuote: '‘',
    closeSingleQuote: '’',
    emDash: '—',
    ellipsis: '…',
  }),
  // 2026-07-06: UniqueID برای block-level nodes. این IDها پیش‌نیاز
  // هستن برای:
  //   - TOC anchor links (هر heading با data-id قابل لینک‌شدن می‌شه)
  //   - Collaboration cursors (Yjs با UniqueID کار می‌کنه)
  //   - Comments (وقتی اضافه بشه، می‌تونه به ID خاصی attach بشه)
  //   - Snapshot diff (مقایسه‌ی دو نسخه با stable ID دقیق‌تره)
  //
  // فقط nodeهای سطح‌بلاک ID می‌گیرن — text/inline mark‌ها نه. این کار
  // performance رو حفظ می‌کنه (در سند ۱۰KB متن، هزاران text node هست).
  UniqueID.configure({
    attributeName: 'data-id',
    types: [
      'paragraph',
      'heading',
      'image',
      'blockquote',
      'codeBlock',
      'listItem',
      'taskItem',
      'table',
      'tableRow',
      'tableCell',
      'callout',
      'details',
      'math',
      'embed',
    ],
    // 2026-07-06: روی document موجود اعمال نکن. اگه یه پست قدیمی که
    // ID نداره لود بشه، نمی‌خواهیم به‌صورت مخرب روی همه‌ی پاراگراف‌ها
    // ID بگذاریم (باعث تغییر در snapshot diff و در historical commits می‌شه).
    // nodeهای جدیدی که کاربر ایجاد می‌کنه همچنان ID می‌گیرن چون این flag
    // فقط مانع اعمال بر document موجود می‌شه.
    updateDocument: false,
  }),
  // 2026-07-06: File Handler رسمی Tiptap برای فایل‌های drop/paste.
  //
  // استراتژی تقسیم کار:
  //   - تصاویر توسط custom handlePaste/handleDrop در editor.tsx هندل
  //     می‌شن (upload بی‌صدا + بازکردن dialog با alt input). این flow
  //     نیاز به ref روی dialog داره که در سطح extension در دسترس نیست.
  //   - فایل‌های غیرتصویری (PDF، Word، ویدیو، و...) توسط این extension
  //     هندل می‌شن: یه لینک/placeholder در سند درج می‌کنیم.
  //   - اگه روزی نیاز به آپلود کامل فایل‌های غیرتصویری شد، کافیه
  //     URL آپلود endpoint را اینجا اضافه کنیم.
  FileHandler.configure({
    // 2026-07-06: allowedMimeTypes لیست سفید است؛ خالی = هیچ فایلی
    // مجاز نیست. ما می‌خواهیم همه فایل‌ها به callback ما برسن تا بتونیم
    // در سطح callback تصاویر را فیلتر کنیم (که به custom handler در
    // editor.tsx واگذار می‌شن). پس همه‌ی type‌های رایج را allow می‌کنیم.
    allowedMimeTypes: [
      'image/*', // در callback فیلتر می‌شه
      'application/pdf',
      'application/zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'text/plain',
      'text/csv',
      'text/markdown',
    ],
    onDrop: (currentEditor, files, pos) => {
      files.forEach((file) => {
        // safety net: image‌ها توسط custom handler در editor.tsx پردازش
        // می‌شن (upload بی‌صدا + dialog با alt input). اینجا فقط
        // non-image‌ها را درج می‌کنیم.
        if (file.type.startsWith('image/')) return;
        currentEditor
          .chain()
          .insertContentAt(pos, {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `📎 ${file.name}`,
              },
            ],
          })
          .run();
      });
    },
    onPaste: (currentEditor, files, pasteContent) => {
      // paste با محتوای HTML: اگه HTML داریم، بذاریم Tiptap هندل کنه
      // (مثلا وقتی از Word کپی می‌کنیم). فقط فایل‌های pure-file را اینجا
      // درج می‌کنیم.
      if (files.length === 0 || pasteContent) return;
      files.forEach((file) => {
        if (file.type.startsWith('image/')) return;
        currentEditor
          .chain()
          .insertContent({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `📎 ${file.name}`,
              },
            ],
          })
          .run();
      });
    },
  }),
];
