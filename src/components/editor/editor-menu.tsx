'use client';

import { EditorBubble, useEditor } from 'novel';
import { removeAIHighlight } from 'novel/extensions';
import { type ReactNode, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface EditorMenuProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRTL?: boolean;
}

export default function EditorMenu({
  children,
  open,
  onOpenChange,
  isRTL = false,
}: EditorMenuProps) {
  const { editor } = useEditor();

  useEffect(() => {
    if (!editor || !open) return;
    return () => {
      removeAIHighlight(editor);
    };
  }, [open, editor]);

  const handleInteraction = useCallback(
    (event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        handleInteraction(event);
      }
    },
    [handleInteraction],
  );

  return (
    <div
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={handleInteraction}
      onKeyDown={handleKeyDown}
      className="relative"
    >
      <EditorBubble
        tippyOptions={{
          placement: open ? (isRTL ? 'bottom-start' : 'bottom-end') : 'top',
          onHidden: () => {
            onOpenChange(false);
            editor?.chain().unsetHighlight().run();
          },
        }}
        className={cn(
          'flex overflow-hidden rounded-md border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900',
          'w-fit max-w-[90vw]',
          'sm:max-w-[70vw] md:max-w-[50vw] lg:max-w-[50vw]',
          open ? 'flex-col' : isRTL ? 'flex-row-reverse' : 'flex-row',
          isRTL ? 'rtl' : 'ltr',
        )}
      >
        {children}
      </EditorBubble>
    </div>
  );
}
