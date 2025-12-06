import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

export interface FontFamilyOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

export const FontFamily = Extension.create<FontFamilyOptions>({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) {
                return {};
              }
              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

// فونت‌های فارسی آنلاین (Google Fonts / CDN)
export const persianFonts = [
  {
    label: 'وزیرمتن',
    value: 'Vazirmatn',
    url: 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap',
  },
  {
    label: 'یکان بخ',
    value: 'Yekan Bakh',
    url: 'https://cdn.jsdelivr.net/gh/nicefont/yekan-bakh@main/css/yekan-bakh.css',
  },
];

// فونت‌های سیستمی
export const systemFonts = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Lucida Console', value: 'Lucida Console, monospace' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
];

// فونت‌های آنلاین انگلیسی (Google Fonts)
export const googleFonts = [
  {
    label: 'Roboto',
    value: 'Roboto',
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
  },
  {
    label: 'Open Sans',
    value: 'Open Sans',
    url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300..800&display=swap',
  },
  {
    label: 'Lato',
    value: 'Lato',
    url: 'https://fonts.googleapis.com/css2?family=Lato:wght@100..900&display=swap',
  },
  {
    label: 'Montserrat',
    value: 'Montserrat',
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900&display=swap',
  },
  {
    label: 'Poppins',
    value: 'Poppins',
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@100..900&display=swap',
  },
  {
    label: 'Playfair Display',
    value: 'Playfair Display',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&display=swap',
  },
  {
    label: 'Merriweather',
    value: 'Merriweather',
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300..900&display=swap',
  },
  {
    label: 'Source Code Pro',
    value: 'Source Code Pro',
    url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@200..900&display=swap',
  },
];

export interface FontOption {
  label: string;
  value: string;
  url?: string;
  category: 'default' | 'persian' | 'system' | 'google';
}

export const fontFamilies: FontOption[] = [
  { label: 'پیش‌فرض', value: '', category: 'default' },
  ...persianFonts.map((f) => ({ ...f, category: 'persian' as const })),
  ...systemFonts.map((f) => ({ ...f, category: 'system' as const })),
  ...googleFonts.map((f) => ({ ...f, category: 'google' as const })),
];

// تابع برای لود کردن فونت آنلاین
export const loadFont = (fontOption: FontOption) => {
  if (!fontOption.url) return;

  const linkId = `font-${fontOption.value.replace(/\s+/g, '-')}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = fontOption.url;
  document.head.appendChild(link);
};

export default FontFamily;
