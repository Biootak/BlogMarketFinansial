'use client';

/**
 * CustomerArchive — آرشیو مشتریان بسته/مسدود صراف.
 *
 * دو بخش: Frozen (مسدود) + Closed (بسته).
 * قابلیت: جستجو، فیلتر، unfreeze برای مسدودها، مشاهده پروفایل.
 * طرح: asymmetric two-column bento + micro-animations.
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { setCustomerStatus } from '@/actions/exchange-customers';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Clock,
  Inbox,
  Search,
  Shield,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './CustomerArchive.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  exchangeId: string;
  archived: CustomerRow[];
  frozen: CustomerRow[];
  totalCount: number;
  canWrite: boolean;
  primaryCurrency: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(d));
}

function RiskBar({ score }: { score: number }) {
  const tone = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
  return (
    <div className={s.riskBar} aria-label={`امتیاز ریسک ${score}`}>
      <div className={`${s.riskFill} ${s[`risk_${tone}`]}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    FROZEN: { label: 'مسدود', tone: 'amber' },
    CLOSED: { label: 'بسته', tone: 'muted' },
    ACTIVE: { label: 'فعال', tone: 'emerald' },
    PROSPECT: { label: 'احتمالی', tone: 'sky' },
  };
  const cfg = map[status] ?? { label: status, tone: 'muted' };
  return <span className={`${s.pill} ${s[`pill_${cfg.tone}`]}`}>{cfg.label}</span>;
}

// ─── Row Component ────────────────────────────────────────────────────────────

function CustomerRowRow({
  customer,
  canWrite,
  onUnfreeze,
  isPending,
}: {
  customer: CustomerRow;
  canWrite: boolean;
  onUnfreeze: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className={s.row} role="row">
      {/* Avatar */}
      <div className={s.rowAvatar} aria-hidden>
        {customer.fullName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className={s.rowInfo}>
        <Link href={`/exchange/customers/${customer.id}`} className={s.rowName}>
          {customer.fullName}
          <ArrowUpRight size={12} strokeWidth={2} aria-hidden />
        </Link>
        <span className={s.rowPhone} dir="ltr">
          {customer.phone}
        </span>
      </div>

      {/* Meta */}
      <div className={s.rowMeta}>
        {customer.city && <span className={s.rowCity}>{customer.city}</span>}
        <RiskBar score={customer.riskScore} />
      </div>

      {/* Status */}
      <div className={s.rowStatus}>
        <StatusPill status={customer.status} />
        <span className={s.rowDate}>{fmtDate(customer.createdAt)}</span>
      </div>

      {/* Action */}
      {canWrite && customer.status === 'FROZEN' && (
        <button
          type="button"
          className={s.unfreezeBtn}
          onClick={() => onUnfreeze(customer.id)}
          disabled={isPending}
          aria-label={`فعال‌سازی مجدد ${customer.fullName}`}
        >
          <UserCheck size={14} aria-hidden />
          فعال‌سازی
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerArchive({
  exchangeId,
  archived,
  frozen,
  totalCount,
  canWrite,
  primaryCurrency: _primaryCurrency,
}: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'frozen' | 'closed'>('frozen');
  const [localFrozen, setLocalFrozen] = useState<CustomerRow[]>(frozen);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const currentList = activeTab === 'frozen' ? localFrozen : archived;

  const filtered = useMemo(() => {
    if (!search.trim()) return currentList;
    const q = search.trim().toLowerCase();
    return currentList.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.city ?? '').toLowerCase().includes(q),
    );
  }, [currentList, search]);

  const handleUnfreeze = useCallback(
    (customerId: string) => {
      startTransition(async () => {
        const res = await setCustomerStatus(exchangeId, customerId, 'ACTIVE');
        if (!res.success) {
          toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
          return;
        }
        setLocalFrozen((prev) => prev.filter((c) => c.id !== customerId));
        toast({ title: 'فعال شد', description: 'مشتری با موفقیت فعال‌سازی شد.' });
      });
    },
    [exchangeId, toast],
  );

  return (
    <div className={s.root}>
      {/* ── Stats Bar ── */}
      <div className={s.statsBar}>
        <div className={s.statCell}>
          <Archive size={16} className={s.statIcon} aria-hidden />
          <div>
            <span className={s.statValue}>
              {new Intl.NumberFormat('fa-IR').format(localFrozen.length + archived.length)}
            </span>
            <span className={s.statLabel}>کل آرشیو</span>
          </div>
        </div>
        <div className={s.statSep} aria-hidden />
        <div className={s.statCell}>
          <AlertTriangle size={16} className={`${s.statIcon} ${s.iconAmber}`} aria-hidden />
          <div>
            <span className={s.statValue}>
              {new Intl.NumberFormat('fa-IR').format(localFrozen.length)}
            </span>
            <span className={s.statLabel}>مسدود</span>
          </div>
        </div>
        <div className={s.statSep} aria-hidden />
        <div className={s.statCell}>
          <XCircle size={16} className={`${s.statIcon} ${s.iconMuted}`} aria-hidden />
          <div>
            <span className={s.statValue}>
              {new Intl.NumberFormat('fa-IR').format(archived.length)}
            </span>
            <span className={s.statLabel}>بسته</span>
          </div>
        </div>
        <div className={s.statSep} aria-hidden />
        <div className={s.statCell}>
          <Users size={16} className={s.statIcon} aria-hidden />
          <div>
            <span className={s.statValue}>{new Intl.NumberFormat('fa-IR').format(totalCount)}</span>
            <span className={s.statLabel}>کل مشتریان</span>
          </div>
        </div>
      </div>

      {/* ── Tabs + Search ── */}
      <div className={s.toolbar}>
        <div className={s.tabs} role="tablist" aria-label="نوع آرشیو">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'frozen'}
            className={`${s.tab} ${activeTab === 'frozen' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('frozen')}
          >
            <AlertTriangle size={14} aria-hidden />
            مسدود ({new Intl.NumberFormat('fa-IR').format(localFrozen.length)})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'closed'}
            className={`${s.tab} ${activeTab === 'closed' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('closed')}
          >
            <Archive size={14} aria-hidden />
            بسته ({new Intl.NumberFormat('fa-IR').format(archived.length)})
          </button>
        </div>

        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} aria-hidden />
          <input
            type="search"
            className={s.searchInput}
            placeholder="جستجو نام، تلفن، شهر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="جستجو در آرشیو"
          />
        </div>
      </div>

      {/* ── List ── */}
      <Section>
        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'نتیجه‌ای یافت نشد' : 'آرشیو خالی'}
            description={
              search
                ? 'فیلتر جستجو را تغییر دهید.'
                : activeTab === 'frozen'
                  ? 'هیچ مشتری مسدودی وجود ندارد.'
                  : 'هیچ مشتری بسته‌شده‌ای وجود ندارد.'
            }
            icon={activeTab === 'frozen' ? Shield : Inbox}
          />
        ) : (
          <div className={s.list} role="table" aria-label="لیست آرشیو مشتریان">
            <div className={s.listHeader} role="row">
              <span>مشتری</span>
              <span>اطلاعات</span>
              <span>ریسک</span>
              <span>وضعیت</span>
              {canWrite && activeTab === 'frozen' && <span>عملیات</span>}
            </div>
            {filtered.map((customer, idx) => (
              <div
                key={customer.id}
                style={{ animationDelay: `${idx * 35}ms` }}
                className={s.rowWrapper}
              >
                <CustomerRowRow
                  customer={customer}
                  canWrite={canWrite}
                  onUnfreeze={handleUnfreeze}
                  isPending={isPending}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Notice ── */}
      {activeTab === 'closed' && archived.length > 0 && (
        <div className={s.notice}>
          <Clock size={14} aria-hidden />
          <span>
            مشتریان بسته برای مقاصد قانونی و حسابرسی حفظ می‌شوند. برای بازگشایی با تیم پشتیبانی تماس
            بگیرید.
          </span>
        </div>
      )}

      {activeTab === 'frozen' && !canWrite && localFrozen.length > 0 && (
        <div className={s.notice}>
          <Shield size={14} aria-hidden />
          <span>شما دسترسی لازم برای تغییر وضعیت مشتریان ندارید (نقش Viewer).</span>
        </div>
      )}
    </div>
  );
}
