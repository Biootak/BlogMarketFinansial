'use client';

/**
 * TrackShareButton — منوی اشتراک‌گذاری لینک پیگیری
 *
 * صفحه‌ی /track عمومی است؛ این دکمه به کاربر اجازه می‌دهد وضعیت
 * معامله را با کسی (مثلاً دریافت‌کننده) به اشتراک بگذارد.
 * گزینه‌ها: تلگرام، واتساپ، کپی لینک و Share بومی دستگاه (اگر موجود باشد).
 */
import { CheckCircle2, Copy, MessageCircle, Send, Share2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './TrackShareButton.module.css';

const SHARE_TEXT = 'وضعیت معامله‌ی من را دنبال کن:';

export default function TrackShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  // بستن منو با کلیک بیرون یا Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({
        title: 'پیگیری معامله',
        text: SHARE_TEXT,
        url: window.location.href,
      });
      setOpen(false);
    } catch {
      // کاربر منو را بست یا مرورگر پشتیبانی نمی‌کند — کاری نمی‌کنیم
    }
  }, []);

  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(SHARE_TEXT)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`)}`;

  return (
    <div className={s.wrap} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${s.shareBtn} ${open ? s.shareBtnActive : ''}`}
        aria-label="اشتراک‌گذاری لینک پیگیری"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {open ? (
          <X size={13} strokeWidth={2} aria-hidden />
        ) : (
          <Share2 size={13} strokeWidth={1.75} aria-hidden />
        )}
        اشتراک‌گذاری
      </button>

      {open && (
        <div className={s.menu} role="menu" aria-label="گزینه‌های اشتراک‌گذاری">
          <a
            className={s.item}
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
          >
            <span className={`${s.itemIcon} ${s.itemTelegram}`} aria-hidden>
              <Send size={14} strokeWidth={2} style={{ transform: 'scaleX(-1)' }} />
            </span>
            ارسال به تلگرام
          </a>
          <a
            className={s.item}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
          >
            <span className={`${s.itemIcon} ${s.itemWhatsapp}`} aria-hidden>
              <MessageCircle size={14} strokeWidth={2} />
            </span>
            ارسال به واتساپ
          </a>
          <button type="button" className={s.item} onClick={handleCopy} role="menuitem">
            <span className={`${s.itemIcon} ${s.itemCopy}`} aria-hidden>
              {copied ? (
                <CheckCircle2 size={14} strokeWidth={2} />
              ) : (
                <Copy size={14} strokeWidth={1.75} />
              )}
            </span>
            {copied ? 'لینک کپی شد!' : 'کپی لینک'}
          </button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button type="button" className={s.item} onClick={handleNativeShare} role="menuitem">
              <span className={`${s.itemIcon} ${s.itemNative}`} aria-hidden>
                <Share2 size={14} strokeWidth={1.75} />
              </span>
              اشتراک‌گذاری بومی
            </button>
          )}
        </div>
      )}
    </div>
  );
}
