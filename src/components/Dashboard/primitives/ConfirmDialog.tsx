'use client';

/**
 * ConfirmDialog — premium confirmation modal (2026)
 *
 * از DialogPrimitive.Content استفاده نمی‌کنه — فقط Portal برای mount.
 * Overlay + centering کاملاً با div‌های خودمون کنترل میشه.
 * Focus trap و a11y از طریق DialogPrimitive.Root هندل میشه.
 *
 * Tokens: --ds-* / --nova-* only
 * RTL: logical properties only
 * Animation: opacity + transform only
 */

import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, X, XCircle } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import s from './ConfirmDialog.module.css';

export type ConfirmDialogVariant = 'default' | 'danger' | 'caution';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  rejectLabel?: string;
  onConfirm: () => void;
  onReject?: () => void;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  body?: ReactNode;
  icon?: ComponentType<LucideProps>;
  warning?: string;
  closeOnOverlay?: boolean;
  showReject?: boolean;
}

const VARIANT_ICONS: Record<ConfirmDialogVariant, ComponentType<{ className?: string }>> = {
  default: CheckCircle2,
  danger: XCircle,
  caution: AlertTriangle,
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  rejectLabel = 'رد',
  onConfirm,
  onReject,
  variant = 'default',
  loading = false,
  body,
  icon: CustomIcon,
  warning,
  closeOnOverlay = true,
  showReject = false,
}: ConfirmDialogProps) {
  const IconComp = CustomIcon ?? VARIANT_ICONS[variant];
  const close = () => onOpenChange(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* ── Overlay ── */}
        <div className={s.overlay} aria-hidden onClick={closeOnOverlay ? close : undefined} />

        {/* ── Centering shell — کاملاً مستقل از Radix positioning ── */}
        <DialogPrimitive.Content
          asChild
          onPointerDownOutside={(e) => {
            if (!closeOnOverlay) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!closeOnOverlay) e.preventDefault();
          }}
        >
          <div
            className={s.root}
            dir="rtl"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              width: '100%',
              height: '100%',
              maxWidth: 'none',
              margin: 0,
              transform: 'none',
              display: 'grid',
              placeItems: 'center',
              zIndex: 9999,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            {/* Card */}
            <div className={s.card} onClick={(e) => e.stopPropagation()}>
              {/* Close button */}
              <DialogPrimitive.Close asChild>
                <button type="button" className={s.closeBtn} aria-label="بستن">
                  <X size={16} strokeWidth={2} />
                </button>
              </DialogPrimitive.Close>

              {/* Ambient wash */}
              <span className={cn(s.wash, s[`wash_${variant}`])} aria-hidden />

              {/* Icon */}
              <div className={s.iconSection}>
                <div className={cn(s.iconWrap, s[`icon_${variant}`])} aria-hidden>
                  <IconComp size={28} strokeWidth={2} />
                </div>
              </div>

              {/* Text */}
              <div className={s.content}>
                <DialogPrimitive.Title asChild>
                  <h2 className={cn(s.title, s[`title_${variant}`])}>{title}</h2>
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description asChild>
                    <p className={s.description}>{description}</p>
                  </DialogPrimitive.Description>
                )}

                {warning && variant === 'danger' && (
                  <div className={cn(s.warningStrip, s[`warningStrip_${variant}`])}>
                    <ShieldAlert size={14} strokeWidth={2} className={s.warningIcon} aria-hidden />
                    <span>{warning}</span>
                  </div>
                )}

                {body}
              </div>

              {/* Actions */}
              <div className={cn(s.footer, showReject && s.footerThree)}>
                <button type="button" className={s.cancelBtn} onClick={close} disabled={loading}>
                  <X size={14} strokeWidth={1.75} />
                  {cancelLabel}
                </button>
                {showReject && (
                  <button
                    type="button"
                    className={s.rejectBtn}
                    onClick={() => {
                      onReject?.();
                      close();
                    }}
                    disabled={loading}
                  >
                    <XCircle size={14} strokeWidth={2} />
                    {rejectLabel}
                  </button>
                )}
                <button
                  type="button"
                  className={cn(s.confirmBtn, s[`confirmBtn_${variant}`])}
                  onClick={onConfirm}
                  disabled={loading}
                  aria-busy={loading || undefined}
                >
                  {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
                  {loading ? 'در حال پردازش…' : confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
