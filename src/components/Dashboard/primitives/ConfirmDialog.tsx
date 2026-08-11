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
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import s from './ConfirmDialog.module.css';

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

const ICON_MAP: Record<string, ReactNode> = {
  default: <CheckCircle2 size={20} />,
  danger: <XCircle size={20} />,
};

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
      <DialogContent className={cn('max-w-md', s.root)} dir="rtl">
        {/* Icon treatment */}
        <div className={cn(s.iconWrap, isDanger ? s.iconDanger : s.iconDefault)} aria-hidden>
          {ICON_MAP[variant]}
        </div>

        <DialogHeader>
          <DialogTitle className={cn(s.title, isDanger && s.titleDanger)}>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {body}
        <DialogFooter className={cn('mt-4 gap-2', s.footer)}>
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
            className={cn(
              'ds2-btn ds2-btn--md',
              isDanger ? 'ds2-btn--danger' : 'ds2-btn--primary',
              s.confirmBtn,
            )}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {loading ? 'در حال پردازش…' : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
