'use client';

/**
 * PanelDrawer — slide-in drawer مشترک برای همه پنل‌های سایت.
 *
 * الگوی overlay → panel → sticky header → scrollable body → sticky footer
 * در CustomerDrawer، TransactionsWorkspace و StaffWorkspace تکرار شده بود.
 * از این component جایگزین همه استفاده می‌کنند.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 * <PanelDrawer
 *   open={open}
 *   title="عنوان"
 *   onClose={() => setOpen(false)}
 *   footer={<><button>ذخیره</button><button>انصراف</button></>}
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
  /** عرض drawer — پیش‌فرض min(460px, 100vw) */
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
      <dialog open className={s.panel} style={width ? { width } : undefined} aria-label={title}>
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
      </dialog>
    </div>,
    document.body,
  );
}
