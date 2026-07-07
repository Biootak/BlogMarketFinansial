import { ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import { mergeAttributes } from '@tiptap/core';
import { Image as BaseImage } from '@tiptap/extension-image';
import ResizeImage from '../components/resize-image';

// 2026-07-06: image extension برای resize interactive + attrs کامل.
//   - title: در دیالوگ آپلود ورودی دارد؛ اینجا ذخیره می‌شود.
//   - height: برای renderer مفید است (intrinsic ratio).
//   - width: هم عدد و هم رشتهٔ '100%'/'500px' قبول می‌کند.
//   - textAlign: فقط از data-text-align می‌خوانیم (style توسط
//     DOMPurify حذف می‌شود پس fallback به style.textAlign بی‌اثر است).

// تشخیص رشتهٔ width معتبر: '100%', '500px', '500' یا عدد.
function parseWidth(raw: string | null): string | number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // اگر px یا % دارد، همان رشته را نگه‌دار
  if (/^\d+(?:\.\d+)?(px|%)$/.test(trimmed)) return trimmed;
  // عدد خالص
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function parseHeight(raw: string | null): number | null {
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export default BaseImage.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
      group: 'block',
      defining: true,
      isolating: true,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      // عرض: '100%' | '500px' | 500
      width: {
        default: '100%',
        parseHTML: (element) =>
          parseWidth(element.getAttribute('width')) ?? '100%',
        renderHTML: (attributes) => {
          const w = attributes.width;
          if (w == null) return {};
          return { width: typeof w === 'number' ? `${w}px` : String(w) };
        },
      },
      // ارتفاع: عدد پیکسلی (اختیاری، برای renderer)
      height: {
        default: null,
        parseHTML: (element) => parseHeight(element.getAttribute('height')),
        renderHTML: (attributes) => {
          const h = attributes.height;
          if (h == null) return {};
          return { height: typeof h === 'number' ? `${h}px` : String(h) };
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => {
          const alt = attributes.alt;
          return alt ? { alt } : {};
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          const t = attributes.title;
          return t ? { title: t } : {};
        },
      },
      // 2026-07-06: uploadState — وضعیت آپلود paste/drop.
      //   'pending' — در حال آپلود (URL فعلی blob: است)
      //   'failed'  — آپلود شکست خورد؛ تصویر هنوز در سند است ولی URL محلی می‌باشد
      //   'complete' — URL میزبانی‌شده ست شده و آپلود تمام شده
      // CSS از `[data-upload-state="failed"]` برای overlay هشدار استفاده می‌کند.
      uploadState: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('data-upload-state');
          return v === 'pending' || v === 'failed' || v === 'complete' ? v : null;
        },
        renderHTML: (attributes) => {
          const v = attributes.uploadState;
          return v ? { 'data-upload-state': v } : {};
        },
      },
      // تراز — فقط از data-text-align می‌خوانیم.
      // style توسط DOMPurify حذف می‌شود، پس fallback به style بی‌اثر است.
      textAlign: {
        default: 'center',
        parseHTML: (element) => {
          const dataAlign = element.getAttribute('data-text-align');
          if (dataAlign === 'left' || dataAlign === 'right' || dataAlign === 'center') {
            return dataAlign;
          }
          // fallback برای محتوای قدیمی که با inline style ذخیره شده بود
          // (هنوز در DB وجود دارد ولی در sanitizer حذف می‌شود).
          const classAlign = element.getAttribute('class');
          if (classAlign?.includes('align-left')) return 'left';
          if (classAlign?.includes('align-right')) return 'right';
          return 'center';
        },
        renderHTML: (attributes) => ({
          'data-text-align': attributes.textAlign,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    // biome-ignore lint/suspicious/noExplicitAny: TipTap React 19 compatibility
    return ReactNodeViewRenderer(ResizeImage as any);
  },
});
