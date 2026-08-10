'use client';

import { Keyboard, X } from 'lucide-react';
import { useEffect } from 'react';
import s from './ShortcutsModal.module.css';

const SHORTCUTS = [
  { key: 'Ctrl+K', action: 'باز کردن جستجو' },
  { key: 'Ctrl+/', action: 'نمایش میانبرها' },
  { key: 'Esc', action: 'بستن مودال' },
  { key: 'G → D', action: 'رفتن به داشبورد' },
  { key: 'G → P', action: 'رفتن به پست‌ها' },
  { key: 'G → R', action: 'رفتن به نرخ ارز' },
  { key: 'G → C', action: 'رفتن به مشتریان' },
  { key: 'G → U', action: 'رفتن به کاربران' },
  { key: 'G → H', action: 'رفتن به Helpdesk' },
  { key: 'G → K', action: 'رفتن به KYC Review' },
  { key: 'G → E', action: 'رفتن به صرافی‌ها' },
  { key: 'G → S', action: 'رفتن به تنظیمات' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * ShortcutsModal — keyboard shortcuts reference dialog.
 * Triggered by Ctrl+/.
 */
export function ShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={s.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="میانبرهای کیبورد"
    >
      <div className={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={s.dialogHeader}>
          <span className={s.dialogIcon}>
            <Keyboard size={18} />
          </span>
          <h3 className={s.dialogTitle}>میانبرهای کیبورد</h3>
          <button className={s.closeBtn} onClick={onClose} aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        <div className={s.list}>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className={s.row}>
              <kbd className={s.kbd}>{shortcut.key}</kbd>
              <span className={s.action}>{shortcut.action}</span>
            </div>
          ))}
        </div>

        <div className={s.footer}>
          <span>Esc برای بستن</span>
        </div>
      </div>
    </div>
  );
}
