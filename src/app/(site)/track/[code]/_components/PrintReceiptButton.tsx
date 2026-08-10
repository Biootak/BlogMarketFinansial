'use client';

/**
 * PrintReceiptButton — رسید چاپی پریمیوم
 *
 * برای معاملات/درخواست‌های تکمیل‌شده: دکمه‌ی «دریافت رسید» که پنجره‌ی چاپ را
 * باز می‌کند؛ در خروجی چاپ **فقط** برگه‌ی رسید دیده می‌شود (هیچ چیز دیگری:
 * منو، بنر، دکمه — همه با قوانین @media print مخفی می‌شوند).
 * برگه با portal به body می‌رود چون parent (main) در چاپ مخفی می‌شود.
 */
import { Printer, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './PrintReceiptButton.module.css';

export interface ReceiptLine {
  label: string;
  value: string;
}

export interface ReceiptData {
  docTitle: string;
  trackingCode: string;
  statusFa: string;
  completedAtFa?: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  lines: ReceiptLine[];
  exchangeName?: string;
  exchangeCity?: string;
  footerNote?: string;
}

interface Props {
  receipt: ReceiptData;
  label?: string;
}

/** بارهای بارکد تزئینی — عرض هر بار از خود کاراکتر کد پیگیری می‌آید */
function BarcodeBars({ code }: { code: string }) {
  return (
    <span className={s.barcodeBars} aria-hidden>
      {code.split('').map((ch, i) => (
        <i // biome-ignore lint/suspicious/noArrayIndexKey: decorative barcode, stable order
          key={`${ch}-${i}`}
          style={{
            width: `${1 + ((ch.charCodeAt(0) + i) % 3)}px`,
            marginInlineEnd: `${1 + (i % 3)}px`,
          }}
        />
      ))}
    </span>
  );
}

export default function PrintReceiptButton({ receipt, label = 'دریافت رسید' }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // وقتی برگه‌ی رسید در DOM است، در چاپ فقط برگه دیده شود
    // (حتی اگر وضعیت به‌صورت زنده از طریق polling به COMPLETED رسیده باشد)
    document.body.classList.add('print-receipt-active');
    return () => document.body.classList.remove('print-receipt-active');
  }, []);

  return (
    <>
      <button type="button" className={s.printBtn} onClick={() => window.print()}>
        <Printer size={13} strokeWidth={1.75} aria-hidden />
        {label}
      </button>

      {/* برگه‌ی چاپی — به body پورت می‌شود چون parent (main) در چاپ مخفی می‌شود */}
      {mounted &&
        createPortal(
          <div className={`${s.printSheet} print-receipt-sheet`} aria-hidden>
            <div className={s.sheet}>
              {/* ── هدر برند ── */}
              <header className={s.head}>
                <div className={s.brand}>
                  <span className={s.brandMark} aria-hidden>
                    <Wallet size={16} strokeWidth={2.2} />
                  </span>
                  <span className={s.brandMeta}>
                    <span className={s.brandName}>کیف پول دیجیتال</span>
                    <span className={s.docTitle}>{receipt.docTitle}</span>
                  </span>
                </div>
                <div className={s.codeBlock}>
                  <span className={s.codeLabel}>کد پیگیری</span>
                  <span className={s.codeValue} dir="ltr">
                    {receipt.trackingCode}
                  </span>
                </div>
              </header>

              {/* ── وضعیت ── */}
              <div className={s.statusRow}>
                <span className={s.statusPill}>{receipt.statusFa}</span>
                {receipt.completedAtFa && (
                  <span className={s.completedAt}>{receipt.completedAtFa}</span>
                )}
              </div>

              {/* ── مبالغ ── */}
              <div className={s.amounts}>
                <div className={s.amountItem}>
                  <span className={s.amountLabel}>{receipt.primaryLabel}</span>
                  <span className={s.amountValue} dir="ltr">
                    {receipt.primaryValue}
                  </span>
                </div>
                {receipt.secondaryLabel && receipt.secondaryValue && (
                  <>
                    <span className={s.amountDivider} aria-hidden />
                    <div className={s.amountItem}>
                      <span className={s.amountLabel}>{receipt.secondaryLabel}</span>
                      <span className={s.amountValue} dir="ltr">
                        {receipt.secondaryValue}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* ── جزئیات ── */}
              {receipt.lines.length > 0 && (
                <dl className={s.details}>
                  {receipt.lines.map((line) => (
                    <div className={s.detailRow} key={line.label}>
                      <dt>{line.label}</dt>
                      <dd dir="ltr">{line.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* ── بارکد ── */}
              <div className={s.barcode}>
                <BarcodeBars code={receipt.trackingCode} />
                <span className={s.barcodeCode} dir="ltr">
                  {receipt.trackingCode}
                </span>
              </div>

              {/* ── فوتر ── */}
              <footer className={s.foot}>
                {receipt.exchangeName && (
                  <span className={s.footExchange}>
                    {receipt.exchangeName}
                    {receipt.exchangeCity ? ` — ${receipt.exchangeCity}` : ''}
                  </span>
                )}
                {receipt.footerNote && <span className={s.footNote}>{receipt.footerNote}</span>}
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
