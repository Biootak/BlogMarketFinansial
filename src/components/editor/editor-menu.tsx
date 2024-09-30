'use client';

import { EditorBubble, useEditor } from 'novel';
import { removeAIHighlight } from 'novel/extensions';
import { type ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditorMenuProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditorMenu({ children, open, onOpenChange }: EditorMenuProps) {
  const { editor } = useEditor();

  useEffect(() => {
    if (!editor) return;
    if (!open) removeAIHighlight(editor);
  }, [open, editor]);

  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? 'bottom-end' : 'top',
        onHidden: () => {
          onOpenChange(false);
          editor?.chain().unsetHighlight().run();
        },
      }}
      className={cn(
        'flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900',
        open ? 'flex-col' : 'flex-row',
      )}
    >
      {children}
    </EditorBubble>
  );
}
