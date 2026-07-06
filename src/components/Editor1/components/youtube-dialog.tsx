// YoutubeDialog.tsx — Inkwell 2026
// Dedicated dialog for inserting YouTube video URLs.
// Replaces the previous `window.prompt()` approach in slash-commands,
// giving a polished UX consistent with ImageUploadDialog.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '../../ui/icon';

interface YoutubeDialogProps {
  editor: Editor;
  /** controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Extracts a YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

const YoutubeDialog: React.FC<YoutubeDialogProps> = ({
  editor,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // Reset state every time the dialog opens/closes.
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setError('');
      // Focus input after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const handleInsert = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('لطفاً آدرس ویدیو را وارد کنید.');
      return;
    }

    const videoId = extractYoutubeId(trimmed);
    if (!videoId) {
      setError('آدرس معتبر یوتیوب وارد کنید. مثال: https://youtube.com/watch?v=...');
      return;
    }

    // Build a clean YouTube URL and insert via the embed extension.
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
    editor.chain().focus().setEmbed({ src: cleanUrl }).run();
    setOpen(false);
  }, [url, editor, setOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInsert();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    },
    [handleInsert, setOpen],
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>درج ویدیو یوتیوب</DialogTitle>
          <DialogDescription>
            آدرس ویدیوی یوتیوب را وارد کنید تا در متن جاسازی شود.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="yt-url">آدرس ویدیو</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="yt-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://youtube.com/watch?v=..."
                dir="ltr"
                className="ps-9"
                aria-invalid={!!error}
                aria-describedby={error ? 'yt-url-err' : undefined}
              />
              <Icon
                name="play"
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                aria-hidden
              />
            </div>
            {error && (
              <p id="yt-url-err" className="text-xs text-red-500 flex items-center gap-1" role="alert">
                <Icon name="alert-circle" size={12} aria-hidden />
                {error}
              </p>
            )}
          </div>

          {/* Example formats */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              فرمت‌های پشتیبانی‌شده:
            </p>
            <ul className="text-[11px] text-gray-400 dark:text-gray-500 space-y-0.5 font-mono">
              <li>youtube.com/watch?v=VIDEO_ID</li>
              <li>youtu.be/VIDEO_ID</li>
              <li>youtube.com/shorts/VIDEO_ID</li>
              <li>youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            انصراف
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!url.trim()}>
            <Icon name="play" size={14} className="ms-1" />
            درج ویدیو
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YoutubeDialog;
