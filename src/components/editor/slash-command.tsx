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
    title: 'Text',
    description: 'Just start typing with plain text.',
    searchTerms: ['p', 'paragraph'],
    icon: <RiText size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run();
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with a to-do list.',
    searchTerms: ['todo', 'task', 'list', 'check', 'checkbox'],
    icon: <RiCheckboxLine size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading.',
    searchTerms: ['title', 'big', 'large'],
    icon: <RiH1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    searchTerms: ['subtitle', 'medium'],
    icon: <RiH2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    searchTerms: ['subtitle', 'small'],
    icon: <RiH3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list.',
    searchTerms: ['unordered', 'point'],
    icon: <RiListUnordered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    searchTerms: ['ordered'],
    icon: <RiListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote.',
    searchTerms: ['blockquote'],
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
    title: 'Code',
    description: 'Capture a code snippet.',
    searchTerms: ['codeblock'],
    icon: <RiCodeSSlashLine size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Image',
    description: 'Upload an image from your computer.',
    searchTerms: ['photo', 'picture', 'media'],
    icon: <RiImageLine size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
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
      uploader.open();
    },
  },
  {
    title: 'Youtube',
    description: 'Embed a Youtube video.',
    searchTerms: ['video', 'youtube', 'embed'],
    icon: <RiYoutubeLine size={18} />,
    command: ({ editor, range }) => {
      const videoLink = prompt('Please enter Youtube Video Link');
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
          alert('Please enter a correct Youtube Video Link');
        }
      }
    },
  },
  {
    title: 'Twitter',
    description: 'Embed a Tweet.',
    searchTerms: ['twitter', 'embed', 'tweet'],
    icon: <RiTwitterLine size={18} />,
    command: ({ editor, range }) => {
      const tweetLink = prompt('Please enter Twitter Link');
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
          alert('Please enter a correct Twitter Link');
        }
      }
    },
  },
  {
    title: 'Align Left',
    description: 'Align text to the left.',
    searchTerms: ['left', 'align'],
    icon: <RiAlignLeft size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('left').run();
    },
  },
  {
    title: 'Align Center',
    description: 'Center align text.',
    searchTerms: ['center', 'align'],
    icon: <RiAlignCenter size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('center').run();
    },
  },
  {
    title: 'Align Right',
    description: 'Align text to the right.',
    searchTerms: ['right', 'align'],
    icon: <RiAlignRight size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('right').run();
    },
  },
  {
    title: 'Table',
    description: 'Add a table.',
    searchTerms: ['table', 'grid'],
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
    title: 'Link',
    description: 'Add a link.',
    searchTerms: ['link', 'url'],
    icon: <RiLink size={18} />,
    command: ({ editor, range }) => {
      const url = window.prompt('URL');
      if (url) {
        editor.chain().focus().deleteRange(range).setLink({ href: url }).run();
      }
    },
  },
  {
    title: 'Bold',
    description: 'Make text bold.',
    searchTerms: ['bold', 'strong'],
    icon: <RiBold size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run();
    },
  },
  {
    title: 'Italic',
    description: 'Make text italic.',
    searchTerms: ['italic', 'em'],
    icon: <RiItalic size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run();
    },
  },
  {
    title: 'Underline',
    description: 'Underline text.',
    searchTerms: ['underline'],
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
