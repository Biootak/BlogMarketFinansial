'use client';

/**
 * StickySaveBar — یک footer sticky که وقتی فرم تغییر کرده و هنوز ذخیره نشده
 * ظاهر می‌شود. الگو از Linear + Vercel: یک pill bar در پایین viewport که
 * سه پیام را نشان می‌دهد: dirty count، success feedback، error.
 *
 * این کامپوننت client است چون state دارد (visible/in-flight).
 */

import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './StickySaveBar.module.css';

type Status = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  /** وضعیت فعلی فرم */
  status: Status;
  /** تعداد فیلدهای تغییر یافته */
  dirtyCount?: number;
  /** پیام خطا (وقتی status=error) */
  errorMessage?: string | null;
  /** callback برای دکمهٔ ذخیره */
  onSave: () => void;
  /** callback برای دکمهٔ انصراف (بازگشت به مقادیر اولیه) */
  onDiscard?: () => void;
  /** متن دکمهٔ اصلی */
  saveLabel?: string;
  /** auto-hide after saved */
  autoHideMs?: number;
}

export function StickySaveBar({
  status,
  dirtyCount = 0,
  errorMessage,
  onSave,
  onDiscard,
  saveLabel = 'ذخیره تغییرات',
  autoHideMs = 3200,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [hiding, setHiding] = useState(false);

  // show only when dirty / saving / saved / error
  const visible = status !== 'idle';

  // mount transition
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setHiding(false);
    } else if (mounted) {
      // small fade-out
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, mounted]);

  // auto-hide on saved
  useEffect(() => {
    if (status === 'saved') {
      const t = setTimeout(() => setHiding(true), autoHideMs);
      const t2 = setTimeout(() => {
        setHiding(false);
      }, autoHideMs + 240);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
    return undefined;
  }, [status, autoHideMs]);

  if (!mounted) return null;

  return (
    <div
      className={`${s.bar} ${hiding ? s.hiding : ''} ${s[`bar_${status}`]}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className={s.inner}>
        {/* Status text */}
        <div className={s.text}>
          {status === 'dirty' && (
            <>
              <span className={s.dot} aria-hidden />
              <span>
                <strong>{toFa(dirtyCount)}</strong> فیلد تغییر کرده — ذخیره فراموش نشود
              </span>
            </>
          )}
          {status === 'saving' && (
            <>
              <Loader2 size={14} className={s.spin} aria-hidden />
              <span>در حال ذخیره…</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <CheckCircle2 size={14} aria-hidden />
              <span>تغییرات ذخیره شدند</span>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={14} aria-hidden />
              <span>{errorMessage ?? 'خطا در ذخیره'}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className={s.actions}>
          {status === 'dirty' && onDiscard && (
            <button type="button" className={s.btnGhost} onClick={onDiscard}>
              انصراف
            </button>
          )}
          {(status === 'dirty' || status === 'error') && (
            <button type="button" className={s.btnPrimary} onClick={onSave}>
              <Save size={13} aria-hidden />
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function toFa(n: number): string {
  return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(n);
}
