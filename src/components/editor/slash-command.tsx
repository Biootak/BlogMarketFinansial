import React from 'react';
import {
  RiCheckboxLine,
  RiCodeSSlashLine,
  RiH1,
  RiH2,
  RiH3,
  RiImageLine,
  RiListUnordered,
  RiListOrdered,
  RiText,
  RiDoubleQuotesL,
  RiYoutubeLine,
  RiAlignLeft,
  RiAlignCenter,
  RiAlignRight,
  RiTable2,
  RiLink,
  RiBold,
  RiItalic,
  RiUnderline,
  RiTwitterLine,
} from 'react-icons/ri';
import { createSuggestionItems } from 'novel/extensions';
import { Command, renderItems } from 'novel/extensions';
import { ImageUploaderClass } from '../ImageUpload/ImageUploader';

export const suggestionItems = createSuggestionItems([
  {
    title: 'متن',
    description: 'شروع به نوشتن متن ساده کنید.',
    searchTerms: ['پاراگراف', 'متن'],
    icon: <RiText size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run();
    },
  },
  {
    title: 'لیست وظایف',
    description: 'وظایف را با یک لیست چک‌باکس پیگیری کنید.',
    searchTerms: ['وظیفه', 'لیست', 'چک', 'چک‌باکس'],
    icon: <RiCheckboxLine size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'عنوان ۱',
    description: 'عنوان بزرگ برای بخش.',
    searchTerms: ['عنوان', 'بزرگ'],
    icon: <RiH1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'عنوان ۲',
    description: 'عنوان متوسط برای بخش.',
    searchTerms: ['زیرعنوان', 'متوسط'],
    icon: <RiH2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'عنوان ۳',
    description: 'عنوان کوچک برای بخش.',
    searchTerms: ['زیرعنوان', 'کوچک'],
    icon: <RiH3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'لیست نقطه‌ای',
    description: 'یک لیست نقطه‌ای ساده ایجاد کنید.',
    searchTerms: ['نامرتب', 'بولت'],
    icon: <RiListUnordered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'لیست شماره‌دار',
    description: 'یک لیست با شماره‌گذاری ایجاد کنید.',
    searchTerms: ['مرتب'],
    icon: <RiListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'نقل قول',
    description: 'یک نقل قول را وارد کنید.',
    searchTerms: ['بلاک‌کوت'],
    icon: <RiDoubleQuotesL size={18} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode('paragraph', 'paragraph')
        .toggleBlockquote()
        .run(),
  },
  {
    title: 'کد',
    description: 'یک قطعه کد را وارد کنید.',
    searchTerms: ['کدبلاک'],
    icon: <RiCodeSSlashLine size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'تصویر',
    description: 'یک تصویر از کامپیوتر خود آپلود کنید.',
    searchTerms: ['عکس', 'تصویر', 'رسانه'],
    icon: <RiImageLine size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const uploader = new ImageUploaderClass({
            onImageUpload: (urls) => {
              if (urls.length > 0) {
                editor.chain().focus().setImage({ src: urls[0] }).run();
              }
            },
            onImageRemove: () => {},
            maxFiles: 1,
            multiple: false,
          });
          await uploader.uploadFiles([file]);
        }
      };
      input.click();
    },
  },
  {
    title: 'یوتیوب',
    description: 'یک ویدیوی یوتیوب را جاسازی کنید.',
    searchTerms: ['ویدیو', 'یوتیوب', 'جاسازی'],
    icon: <RiYoutubeLine size={18} />,
    command: ({ editor, range }) => {
      const videoLink = prompt('لطفاً لینک ویدیوی یوتیوب را وارد کنید');
      const ytRegex =
        /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
      if (ytRegex.test(videoLink as string)) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setYoutubeVideo({
            src: videoLink as string,
          })
          .run();
      } else {
        if (videoLink !== null) {
          alert('لطفاً یک لینک صحیح ویدیوی یوتیوب وارد کنید');
        }
      }
    },
  },
  {
    title: 'توییتر',
    description: 'یک توییت را جاسازی کنید.',
    searchTerms: ['توییتر', 'جاسازی', 'توییت'],
    icon: <RiTwitterLine size={18} />,
    command: ({ editor, range }) => {
      const tweetLink = prompt('لطفاً لینک توییتر را وارد کنید');
      const tweetRegex =
        /^https?:\/\/(www\.)?x\.com\/([a-zA-Z0-9_]{1,15})(\/status\/(\d+))?(\/\S*)?$/;
      if (tweetRegex.test(tweetLink as string)) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setTweet({
            src: tweetLink as string,
          })
          .run();
      } else {
        if (tweetLink !== null) {
          alert('لطفاً یک لینک صحیح توییتر وارد کنید');
        }
      }
    },
  },
  {
    title: 'تراز راست',
    description: 'متن را به راست تراز کنید.',
    searchTerms: ['راست', 'تراز'],
    icon: <RiAlignRight size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('right').run();
    },
  },
  {
    title: 'تراز وسط',
    description: 'متن را در وسط تراز کنید.',
    searchTerms: ['وسط', 'تراز'],
    icon: <RiAlignCenter size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('center').run();
    },
  },
  {
    title: 'تراز چپ',
    description: 'متن را به چپ تراز کنید.',
    searchTerms: ['چپ', 'تراز'],
    icon: <RiAlignLeft size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('left').run();
    },
  },
  {
    title: 'جدول',
    description: 'یک جدول اضافه کنید.',
    searchTerms: ['جدول', 'شبکه'],
    icon: <RiTable2 size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: 'لینک',
    description: 'یک لینک اضافه کنید.',
    searchTerms: ['لینک', 'پیوند'],
    icon: <RiLink size={18} />,
    command: ({ editor, range }) => {
      const url = window.prompt('آدرس URL را وارد کنید');
      if (url) {
        editor.chain().focus().deleteRange(range).setLink({ href: url }).run();
      }
    },
  },
  {
    title: 'ضخیم',
    description: 'متن را ضخیم کنید.',
    searchTerms: ['ضخیم', 'بولد'],
    icon: <RiBold size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run();
    },
  },
  {
    title: 'مورب',
    description: 'متن را مورب کنید.',
    searchTerms: ['مورب', 'ایتالیک'],
    icon: <RiItalic size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run();
    },
  },
  {
    title: 'زیرخط',
    description: 'زیر متن خط بکشید.',
    searchTerms: ['زیرخط'],
    icon: <RiUnderline size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleUnderline().run();
    },
  },
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
