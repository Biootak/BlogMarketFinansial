'use client';

/**
 * TrackShareButton — کپی لینک پیگیری برای اشتراک‌گذاری
 *
 * صفحه‌ی /track عمومی است؛ این دکمه به کاربر اجازه می‌دهد وضعیت
 * معامله را با کسی (مثلاً دریافت‌کننده) به اشتراک بگذارد.
 */
import { CheckCircle2, Share2 } from 'lucide-react';
import { useState } from 'react';
import s from './TrackShareButton.module.css';

export default function TrackShareButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback for older browsers / non-secure contexts
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
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={s.shareBtn}
      aria-label={copied ? 'لینک پیگیری کپی شد' : 'کپی لینک پیگیری'}
      aria-pressed={copied}
    >
      {copied ? (
        <CheckCircle2 size={13} strokeWidth={2} aria-hidden />
      ) : (
        <Share2 size={13} strokeWidth={1.75} aria-hidden />
      )}
      {copied ? 'لینک کپی شد!' : 'اشتراک‌گذاری'}
    </button>
  );
}
