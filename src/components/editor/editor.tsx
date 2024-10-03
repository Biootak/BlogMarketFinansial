'use client';

import type React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  type JSONContent,
} from 'novel';
import { ImageResizer, handleCommandNavigation } from 'novel/extensions';
import { handleImageDrop, handleImagePaste } from 'novel/plugins';
import { slashCommand, suggestionItems } from './slash-command';
import { Separator } from '../ui/separator';
import { NodeSelector } from './selectors/node-selector';
import { LinkSelector } from './selectors/link-selector';
import { MathSelector } from './selectors/math-selector';
import { TextButtons } from './selectors/text-buttons';
import { ColorSelector } from './selectors/color-selector';
import { AlignmentSelector } from './selectors/alignment-selector';
import { defaultExtensions } from './extensions';
import { ImageUploaderWithRef } from '../ImageUpload/ImageUploader';
import { cn, htmlToEditorContent } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import DOMPurify from 'dompurify';

const hljs = require('highlight.js');

const extensions = [...defaultExtensions, slashCommand];

export const defaultEditorContent: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [],
    },
  ],
};

interface EditorProps {
  initialValue?: JSONContent | string;
  onChange: (content: string) => void;
  isRTL?: boolean;
}

export default function Editor({ initialValue, onChange, isRTL = false }: EditorProps) {
  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAlignment, setOpenAlignment] = useState(false);

  const [editorContent, setEditorContent] = useState<JSONContent>(() => {
    if (typeof initialValue === 'string') {
      return htmlToEditorContent(initialValue);
    }
    return initialValue || defaultEditorContent;
  });

  const decodeHTMLEntities = useCallback((text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }, []);

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const processContent = useCallback(
    (content: string) => {
      const decodedContent = decodeHTMLEntities(content);
      const highlightedContent = highlightCodeblocks(decodedContent);
      return DOMPurify.sanitize(highlightedContent, {
        ADD_TAGS: ['math', 'mrow', 'mi', 'mn', 'mo', 'msup', 'mfrac', 'img', 'span', 'a'],
        ADD_ATTR: [
          'xmlns',
          'src',
          'alt',
          'width',
          'height',
          'style',
          'class',
          'href',
          'target',
          'rel',
        ],
        USE_PROFILES: { mathMl: true, html: true, svg: true },
        ALLOW_DATA_ATTR: true,
        ALLOWED_TAGS: [
          'p',
          'br',
          'strong',
          'em',
          'u',
          's',
          'code',
          'pre',
          'blockquote',
          'ul',
          'ol',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'hr',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'img',
          'a',
          'span',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style'],
        ALLOW_UNKNOWN_PROTOCOLS: true,
        KEEP_CONTENT: true,
        FORCE_BODY: true,
      });
    },
    [decodeHTMLEntities],
  );

  const debouncedOnChange = useDebouncedCallback((content: string) => {
    const processedContent = processContent(content);
    onChange(processedContent);
  }, 300);

  const commandRef = useRef<HTMLDivElement | null>(null);

  const handleImageUpload = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const uploader = new ImageUploaderWithRef({
        onImageUpload: (urls) => {
          if (urls.length > 0) {
            const imageUrl = urls[0];
            resolve(`<img src="${imageUrl}" alt="Uploaded image" />`);
          } else {
            reject(new Error('No image URL returned'));
          }
        },
        onImageRemove: () => {},
        maxFiles: 1,
        multiple: false,
      });

      uploader.uploadFiles([file]);
    });
  }, []);

  useEffect(() => {
    if (typeof initialValue === 'string') {
      console.log('initialValue', initialValue);
      setEditorContent(htmlToEditorContent(initialValue));
    }
  }, [initialValue]);

  useEffect(() => {
    if (commandRef.current) {
      commandRef.current.classList.toggle('novel-editor-command-rtl', isRTL);
      commandRef.current.classList.toggle('novel-editor-command-ltr', !isRTL);
    }
  }, [isRTL]);

  return (
    <div className={cn('relative w-full max-w-screen-lg', isRTL ? 'rtl' : 'ltr')}>
      <EditorRoot>
        <EditorContent
          initialContent={editorContent}
          extensions={extensions}
          className="min-h-96 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, handleImageUpload),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, handleImageUpload),
            attributes: {
              class: cn(
                'prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full',
                isRTL ? 'text-right' : 'text-left',
              ),
              dir: isRTL ? 'rtl' : 'ltr',
            },
          }}
          onUpdate={({ editor }) => {
            const html = editor.getHTML();
            debouncedOnChange(html);
          }}
          slotAfter={<ImageResizer />}
          immediatelyRender={false}
        >
          <EditorCommand
            ref={commandRef as React.Ref<HTMLDivElement>}
            className={cn(
              'novel-editor-command',
              'z-50 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-md transition-all dark:border-neutral-800 dark:bg-neutral-900',
              'h-auto max-h-[50vh] sm:max-h-[40vh] md:max-h-[330px] ',
              'px-1 py-2',
              isRTL ? 'text-right' : 'text-left',
            )}
          >
            <EditorCommandEmpty className="px-2 text-neutral-500 dark:text-neutral-400">
              نتیجه‌ای یافت نشد
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className={cn(
                    'flex w-full items-center space-x-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-100 aria-selected:bg-neutral-100 dark:hover:bg-neutral-800 dark:aria-selected:bg-neutral-800',
                    isRTL ? ' space-x-reverse' : 'flex-row',
                  )}
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    {item.icon}
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <EditorBubble
            tippyOptions={{
              placement: 'top',
              appendTo: document.body,
            }}
            className={cn(
              'flex overflow-hidden rounded-md border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900',
              'w-fit max-w-[90vw]',
              'sm:max-w-[70vw] md:max-w-[50vw] lg:max-w-[50vw]',
              isRTL ? 'flex-row-reverse' : 'flex-row',
              isRTL ? 'rtl' : 'ltr',
            )}
          >
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            <Separator orientation="vertical" />
            <AlignmentSelector open={openAlignment} onOpenChange={setOpenAlignment} isRTL={isRTL} />
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
