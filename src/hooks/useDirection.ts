// src/hooks/useDirection.ts — Inkwell 2026
//
// منبع حقیقت برای جهت متن (RTL/LTR) در سمت کلاینت. کامپوننت‌ها به جای
// hardcode `dir="rtl"` یا استفاده از CSS فیزیکال، این hook را مصرف
// می‌کنند تا:
//   1. در تغییر زبان پویا (مثلاً ادیتور چندزبانه) رفتار درست بماند.
//   2. کد Editor shell از cascade `<html dir>` مستقل باشد، مخصوصاً
//      در portalهای tippy.js و bubble menuهایی که body سوار می‌شوند.
//
// SSR-safe: در server-side مقدار `null` برمی‌گردد؛ کامپوننت باید
// default direction را نیز پاس بدهد (در این پروژه همیشه `rtl`).
//
// Usage:
//   const dir = useDirection('rtl');
//   return <div dir={dir ?? 'rtl'} />

'use client';

import { useEffect, useState } from 'react';

export type Direction = 'rtl' | 'ltr';

function readDirection(): Direction | null {
  if (typeof document === 'undefined') return null;
  const v = document.documentElement.getAttribute('dir');
  return v === 'rtl' || v === 'ltr' ? v : null;
}

/**
 * آخرین مقدار `dir` تگ `<html>` را به صورت reactive برمی‌گرداند.
 * یک MutationObserver به `document.documentElement` وصل می‌شود تا
 * تغییرات آتنده (lang switcher، پنل ادیتور LTR جداگانه) را هم بگیرد.
 *
 * @param defaultDir مقدار پیش‌فرض وقتی هنوز mount نشده یا مقدار
 *                   نامعتبر خوانده شده. در این پروژه `rtl` است.
 */
export function useDirection(defaultDir: Direction = 'rtl'): Direction {
  const [dir, setDir] = useState<Direction | null>(null);

  useEffect(() => {
    setDir(readDirection());

    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      const next = readDirection();
      setDir((prev) => (prev === next ? prev : next));
    });

    observer.observe(target, {
      attributes: true,
      attributeFilter: ['dir', 'lang'],
    });

    return () => observer.disconnect();
  }, []);

  return dir ?? defaultDir;
}

/**
 * نسخه synchronous برای محاسبات non-hook (مثلاً helper داخل extension
 * یا tippy.js plugin). همان منطق `readDirection` اما به صورت ایمن
 * در SSR: اگر document موجود نبود، `defaultDir` را برمی‌گرداند.
 */
export function getDocumentDirection(defaultDir: Direction = 'rtl'): Direction {
  return readDirection() ?? defaultDir;
}
