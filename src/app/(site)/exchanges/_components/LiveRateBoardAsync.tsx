'use client';

/**
 * LiveRateBoardAsync — Client wrapper around the existing ExchangeQuotesBoard.
 *
 *   • Re-mounts the underlying board on the client (it's 'use client' already
 *     but it is a heavyweight client island; we use it here as-is).
 *   • Listens for a global `exchanges:switch-currency` CustomEvent, dispatched
 *     by CurrencyPulseGrid tiles, and clicks the matching tab to switch the
 *     table view. This is non-invasive — no changes to ExchangeQuotesBoard.
 *   • Auto-scrolls to the board when a tile is clicked.
 *   • Marks the section with `data-board-root` so the listener can find it.
 */

import ExchangeQuotesBoard from '@/components/MoneyTransfer/ExchangeQuotesBoard';
import { ArrowDown, BarChart3, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import s from './LiveRateBoard.module.css';

type Props = {
  heading?: string;
  subheading?: string;
};

const SWITCH_EVENT = 'exchanges:switch-currency';

export function switchBoardCurrency(code: string): void {
  // dispatched on `window` for cross-tree propagation
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SWITCH_EVENT, { detail: { code } }));
  // also scroll to the board
  const root = document.getElementById('rate-board');
  if (root) {
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function LiveRateBoardAsync({
  heading = 'تابلوی نرخ‌های زنده',
  subheading = 'نرخ‌ها مستقیماً توسط صرافی‌های تأییدشده ثبت می‌شوند و هر ۳۰ ثانیه به‌روز می‌گردند. بهترین نرخ در هر ردیف با نشانگر سبز مشخص شده است.',
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onSwitch(e: Event) {
      const code = (e as CustomEvent<{ code: string }>).detail?.code;
      if (!code) return;
      const root = rootRef.current;
      if (!root) return;
      // the ExchangeQuotesBoard renders tabs as <button role="tab">. The tab
      // text contains the code as the first inline span. Find by text.
      const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      for (const tab of Array.from(tabs)) {
        // first non-empty text node contains the code
        const txt = (tab.textContent ?? '').trim().toUpperCase();
        if (txt.startsWith(code.toUpperCase())) {
          tab.click();
          tab.focus({ preventScroll: true });
          break;
        }
      }
    }
    window.addEventListener(SWITCH_EVENT, onSwitch);
    return () => window.removeEventListener(SWITCH_EVENT, onSwitch);
  }, []);

  return (
    <section
      id="rate-board"
      className={s.section}
      ref={rootRef}
      data-board-root
      aria-label="تابلوی نرخ زنده"
    >
      <header className={s.head}>
        <span className={s.eyebrow}>
          <BarChart3 size={12} strokeWidth={2.5} aria-hidden />
          نرخ لحظه‌ای
        </span>
        <h2 className={s.title}>{heading}</h2>
        <p className={s.subtitle}>{subheading}</p>
        <div className={s.hint}>
          <Sparkles size={11} strokeWidth={2.5} aria-hidden />
          برای معامله، روی دکمه «معامله» در ردیف صرافی مورد نظر بزنید.
        </div>
        <div className={s.scrollHint} aria-hidden>
          <ArrowDown size={11} strokeWidth={2.5} />
          <span>برای تغییر ارز، روی یکی از بلوک‌های «نگاه کلی» بزنید</span>
        </div>
      </header>
      <ExchangeQuotesBoard />
    </section>
  );
}
