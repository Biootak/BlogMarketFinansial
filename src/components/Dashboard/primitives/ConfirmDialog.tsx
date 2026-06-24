'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'danger';
  loading?: boolean;
  /** Optional extra content rendered below the description. */
  body?: ReactNode;
}

/**
 * ConfirmDialog — Persian copy, two-button confirmation modal.
 *
 * Uses the existing shadcn Dialog primitive. No Radix AlertDialog wrapper
 * is installed in this project, so we render a footer with explicit
 * cancel + confirm buttons inside DialogContent.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  onConfirm,
  variant = 'default',
  loading = false,
  body,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn(isDanger && 'text-rose-600 dark:text-rose-400')}>
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {body}
        <DialogFooter className="mt-2 gap-2">
          <button
            type="button"
            className="ds2-btn ds2-btn--ghost ds2-btn--md"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn('ds2-btn ds2-btn--md', isDanger ? 'ds2-btn--danger' : 'ds2-btn--primary')}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {loading ? 'در حال پردازش…' : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
