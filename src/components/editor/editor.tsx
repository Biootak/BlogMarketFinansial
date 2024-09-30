'use client';

import React, { useState, useCallback } from 'react';
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

const hljs = require('highlight.js');

const extensions = [...defaultExtensions, slashCommand];

export const defaultEditorContent = {
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
  const [openAI, setOpenAI] = useState(false);
  const [openAlignment, setOpenAlignment] = useState(false);

  const [editorContent, setEditorContent] = useState<JSONContent | undefined>(() => {
    if (typeof initialValue === 'string') {
      return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: initialValue }] }],
      };
    }
    return initialValue;
  });

  const uploadFn = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const uploader = new ImageUploaderClass({
        onImageUpload: (urls) => {
          if (urls.length > 0) {
            resolve(urls[0]);
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

  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  return (
    <div className="relative w-full max-w-screen-lg" dir={isRTL ? 'rtl' : 'ltr'}>
      <EditorRoot>
        <EditorContent
          immediatelyRender={false}
          initialContent={editorContent}
          extensions={extensions}
          className="min-h-96 rounded-xl border p-4"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class: `prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full ${
                isRTL ? 'text-right' : 'text-left'
              }`,
              dir: isRTL ? 'rtl' : 'ltr',
            },
          }}
          onUpdate={({ editor }) => {
            onChange(editor.getHTML());
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
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
            <AlignmentSelector open={openAlignment} onOpenChange={setOpenAlignment} />
          </EditorMenu>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
