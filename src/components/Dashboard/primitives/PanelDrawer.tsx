'use client';

/**
 * PanelDrawer — مودال وسط مشترک برای همه پنل‌های سایت.
 *
 * 2026-08-01: از drawer کناری به مودال وسط (centered) تبدیل شد.
 * الگوی overlay → panel → sticky header → scrollable body → sticky footer.
 * همهٔ پنل‌های سایت (customers، quotes، transactions، helpdesk) از همین
 * primitive استفاده می‌کنند — یک تغییر اینجا همه را یکدست می‌کند.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 * <PanelDrawer
 *   open={open}
 *   title="عنوان"
 *   onClose={() => setOpen(false)}
 *   footer={<><button>ذخیره</button><button>انصراف</button></>}
 *   width="min(560px, 100vw)"
 * >
 *   {form content}
 * </PanelDrawer>
 */

import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import s from './PanelDrawer.module.css';

export interface PanelDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** محتوای body drawer */
  children: ReactNode;
  /** محتوای footer — دکمه‌های action */
  footer?: ReactNode;
  /** عرض مودال — پیش‌فرض min(460px, 100%) */
  width?: string;
}

export function PanelDrawer({ open, title, onClose, children, footer, width }: PanelDrawerProps) {
  // بستن با Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className={s.overlay}
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={s.panel}
        style={width ? { width } : undefined}
      >
        {/* Sticky header */}
        <div className={s.header}>
          <span className={s.headerTitle}>{title}</span>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="بستن">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable body */}
        <div className={s.body}>{children}</div>

        {/* Sticky footer */}
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
