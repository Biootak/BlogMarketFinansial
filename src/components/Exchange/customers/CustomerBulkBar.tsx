/**
 * CustomerBulkBar — نوار اقدام گروهی روی مشتریان انتخاب‌شده.
 *
 * وقتی selectedIds.size > 0 به‌صورت slide-up از پایین ظاهر می‌شود.
 * شامل: شمارنده، تغییر وضعیت (active/frozen/closed)، خروجی CSV، پاک کردن.
 */

import { bulkSetCustomerStatus } from '@/actions/exchange-customers';
import type { CustomerRow } from '@/actions/exchange-customers';
import { useToast } from '@/components/ui/use-toast';
import { formatNumber } from '@/lib/customer-format';
import { CheckCircle2, Download, Lock, ShieldOff, Trash2, Unlock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import s from './CustomerBulkBar.module.css';

interface Props {
  exchangeId: string;
  selectedIds: Set<string>;
  rows: CustomerRow[];
  onClear: () => void;
}

type BulkStatus = 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED';

const STATUS_OPTIONS: Array<{
  key: BulkStatus;
  label: string;
  icon: typeof CheckCircle2;
  tone: 'emerald' | 'amber' | 'rose' | 'muted';
}> = [
  { key: 'ACTIVE', label: 'فعال‌سازی', icon: CheckCircle2, tone: 'emerald' },
  { key: 'FROZEN', label: 'مسدود', icon: Lock, tone: 'amber' },
  { key: 'CLOSED', label: 'بستن', icon: ShieldOff, tone: 'rose' },
  { key: 'PROSPECT', label: 'احتمالی', icon: Unlock, tone: 'muted' },
];

export function CustomerBulkBar({ exchangeId, selectedIds, rows, onClear }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<BulkStatus | null>(null);

  const count = selectedIds.size;
  const visible = count > 0;

  const selectedRows = rows.filter((r) => selectedIds.has(r.id));

  const applyStatus = useCallback(
    (status: BulkStatus) => {
      startTransition(async () => {
        const ids = Array.from(selectedIds);
        const result = await bulkSetCustomerStatus(exchangeId, ids, status);
        if (result.success) {
          toast({
            title: 'وضعیت گروهی اعمال شد',
            description: `${formatNumber(result.data.count)} مشتری به‌روزرسانی شد`,
          });
          onClear();
          router.refresh();
        } else {
          toast({
            title: 'خطا',
            description: result.error.message,
            variant: 'destructive',
          });
        }
        setConfirming(null);
      });
    },
    [exchangeId, selectedIds, toast, onClear, router],
  );

  const handleExportCsv = useCallback(() => {
    if (selectedRows.length === 0) return;

    const header = ['نام', 'تلفن', 'شهر', 'وضعیت', 'KYC', 'ریسک', 'تاریخ ثبت'];
    const lines = [header.join(',')];
    for (const r of selectedRows) {
      const date = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(r.createdAt));
      lines.push(
        [
          `"${r.fullName.replace(/"/g, '""')}"`,
          `"${r.phone}"`,
          `"${r.city ?? ''}"`,
          r.status,
          r.kycLevel,
          String(r.riskScore),
          date,
        ].join(','),
      );
    }
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'خروجی CSV ساخته شد',
      description: `${formatNumber(selectedRows.length)} مشتری`,
    });
  }, [selectedRows, toast]);

  if (!visible) return null;

  return (
    <div
      className={s.bar}
      role="region"
      aria-label={`${formatNumber(count)} مشتری انتخاب شده`}
      aria-live="polite"
    >
      <div className={s.inner}>
        {/* Count + clear */}
        <div className={s.count}>
          <span className={s.dot} aria-hidden />
          <span className={s.countText}>
            <strong>{formatNumber(count)}</strong> مشتری انتخاب شده
          </span>
          <button type="button" className={s.clearBtn} onClick={onClear} aria-label="لغو انتخاب">
            <X size={14} aria-hidden />
          </button>
        </div>

        <div className={s.divider} aria-hidden />

        {/* Status actions */}
        <div className={s.actions}>
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                className={s.actionBtn}
                data-tone={opt.tone}
                disabled={pending}
                onClick={() => {
                  if (opt.key === 'FROZEN' || opt.key === 'CLOSED') {
                    setConfirming(opt.key);
                  } else {
                    applyStatus(opt.key);
                  }
                }}
              >
                <Icon size={13} aria-hidden />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className={s.divider} aria-hidden />

        {/* Export */}
        <button type="button" className={s.exportBtn} onClick={handleExportCsv} disabled={pending}>
          <Download size={13} aria-hidden />
          <span>خروجی CSV</span>
        </button>

        {pending && (
          <span className={s.spinner} aria-label="در حال پردازش">
            <span className={s.spinnerDot} />
            <span className={s.spinnerDot} />
            <span className={s.spinnerDot} />
          </span>
        )}
      </div>

      {/* Confirm modal (inline) */}
      {confirming && (
        <div className={s.confirm} role="alertdialog" aria-modal="true">
          <div className={s.confirmPanel}>
            <p className={s.confirmTitle}>
              {confirming === 'FROZEN' ? 'مسدود کردن گروهی' : 'بستن حساب گروهی'}
            </p>
            <p className={s.confirmDesc}>
              {formatNumber(count)} مشتری انتخاب شده{' '}
              {confirming === 'FROZEN'
                ? 'مسدود می‌شوند. معاملات جدید ممکن نخواهد بود.'
                : 'برای همیشه بسته می‌شوند. این عملیات برگشت‌پذیر نیست.'}
            </p>
            <div className={s.confirmActions}>
              <button
                type="button"
                className={s.confirmDanger}
                onClick={() => applyStatus(confirming)}
                disabled={pending}
              >
                {pending ? 'در حال اعمال…' : 'تأیید'}
              </button>
              <button
                type="button"
                className={s.confirmCancel}
                onClick={() => setConfirming(null)}
                disabled={pending}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash icon sentinel (future) */}
      <span className={s.srOnly} aria-hidden>
        <Trash2 size={0} />
      </span>
    </div>
  );
}

export default CustomerBulkBar;
