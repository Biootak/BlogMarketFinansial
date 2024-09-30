'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
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
import EditorMenu from './editor-menu';
import { Separator } from '../ui/separator';
import { NodeSelector } from './selectors/node-selector';
import { LinkSelector } from './selectors/link-selector';
import { MathSelector } from './selectors/math-selector';
import { TextButtons } from './selectors/text-buttons';
import { ColorSelector } from './selectors/color-selector';
import { AlignmentSelector } from './selectors/alignment-selector';
import { defaultExtensions } from './extensions';
import { ImageUploaderClass } from '../ImageUpload/ImageUploader';
import { useEditorStore } from '@/hooks/editorStore';
import { cn, htmlToEditorContent, sanitizeHtml } from '@/lib/utils';
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
  const {
    openNode,
    setOpenNode,
    openColor,
    setOpenColor,
    openLink,
    setOpenLink,
    openAI,
    setOpenAI,
    openAlignment,
    setOpenAlignment,
  } = useEditorStore();

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

  const highlightCodeblocks = useCallback((content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el);
    });
    return doc.body.innerHTML;
  }, []);

  const processContent = useCallback(
    (content: string) => {
      const decodedContent = decodeHTMLEntities(content);
      const highlightedContent = highlightCodeblocks(decodedContent);
      return DOMPurify.sanitize(highlightedContent, {
        ADD_TAGS: ['math', 'mrow', 'mi', 'mn', 'mo', 'msup', 'mfrac', 'img'],
        ADD_ATTR: ['xmlns', 'src', 'alt', 'width', 'height'],
        USE_PROFILES: { mathMl: true, html: true, svg: true },
        ALLOW_DATA_ATTR: true,
      });
    },
    [decodeHTMLEntities, highlightCodeblocks],
  );

  const debouncedOnChange = useDebouncedCallback((content: string) => {
    const processedContent = processContent(content);
    onChange(processedContent);
  }, 300);

  const handleImageUpload = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const uploader = new ImageUploaderClass({
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
      setEditorContent(htmlToEditorContent(initialValue));
    }
  }, [initialValue]);

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
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-neutral-200 bg-white px-1 py-2 shadow-md transition-all dark:border-neutral-800 dark:bg-neutral-900">
            <EditorCommandEmpty className="px-2 text-neutral-500 dark:text-neutral-400">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-neutral-100 aria-selected:bg-neutral-100 dark:hover:bg-neutral-800 dark:aria-selected:bg-neutral-800"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <EditorMenu open={openAI} onOpenChange={setOpenAI}>
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
          </EditorMenu>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
