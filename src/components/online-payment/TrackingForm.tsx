'use client';

import { type FC, useState } from 'react';
import { Search, Clock, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import s from './TrackingForm.module.css';

// ─── Status Config ─────────────────────────────────────────────────────────── //

const STATUS_CONFIG = {
  PENDING:     { label: 'در انتظار بررسی', icon: Clock,       cls: s.statusPending  },
  IN_PROGRESS: { label: 'در حال انجام',    icon: RefreshCw,   cls: s.statusProgress },
  COMPLETED:   { label: 'تکمیل شده',       icon: CheckCircle2, cls: s.statusDone    },
  CANCELLED:   { label: 'لغو شده',         icon: XCircle,     cls: s.statusCancelled },
};

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT:         'پرداخت آنلاین',
  TUITION_PAYMENT:        'پرداخت شهریه',
  FREELANCE_INCOME:       'نقد کردن درآمد فریلنسری',
  SOFTWARE_PURCHASE:      'خرید نرم‌افزار/اشتراک',
  OTHER:                  'سایر خدمات',
};

// ─── Types ─────────────────────────────────────────────────────────────────── //

type StatusKey = keyof typeof STATUS_CONFIG;

interface TrackingData {
  trackingCode: string;
  fullName: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: StatusKey;
  urgency: string;
  createdAt: Date;
}

// ─── Component ─────────────────────────────────────────────────────────────── //

const TrackingForm: FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    data?: TrackingData;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await getServiceRequestByTrackingCode(code.trim().toUpperCase());
      setResult(res as typeof result);
    } catch {
      setResult({ success: false, message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setLoading(false);
    }
  };

  const status = result?.data?.status ? STATUS_CONFIG[result.data.status] : null;
  const StatusIcon = status?.icon;

  return (
    <div className={s.wrap}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className={s.searchRow}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="کد پیگیری — مثال: BT-XXXXX-XXXX"
          className={s.searchInput}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          aria-label="کد پیگیری درخواست"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className={s.searchBtn}
          aria-label="جستجو"
        >
          {loading ? (
            <span className={s.spinner} aria-hidden="true" />
          ) : (
            <Search size={17} />
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={s.resultWrap} role="region" aria-live="polite" aria-label="نتیجه جستجو">
          {result.success && result.data ? (
            <div className={s.resultCard}>
              {/* Status Badge */}
              {status && StatusIcon && (
                <div className={`${s.statusBadge} ${status.cls}`}>
                  <StatusIcon size={14} />
                  <span>{status.label}</span>
                </div>
              )}

              {/* Info Rows */}
              <dl className={s.infoList}>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>کد پیگیری</dt>
                  <dd className={s.infoValue} dir="ltr">{result.data.trackingCode}</dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>نام</dt>
                  <dd className={s.infoValue}>{result.data.fullName}</dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>نوع خدمات</dt>
                  <dd className={s.infoValue}>
                    {SERVICE_LABELS[result.data.serviceType] ?? result.data.serviceType}
                  </dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>مبلغ</dt>
                  <dd className={s.infoValue} dir="ltr">
                    {result.data.amount} {result.data.currency}
                  </dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>تاریخ ثبت</dt>
                  <dd className={s.infoValue}>
                    {new Date(result.data.createdAt).toLocaleDateString('fa-IR')}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className={s.errorBox} role="alert">
              <AlertCircle size={15} />
              <span>{result.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackingForm;
