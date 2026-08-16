'use client';

/**
 * ServiceRequestsActivityFeed — 2026-07-04 redesign
 *
 * Day-grouped timeline that mirrors the at-activity style from the
 * Atelier 2026 dashboard system. Each group carries a relative label
 * (امروز / دیروز / این هفته / تاریخ کامل) and a count badge. Items
 * inside a group are colored by tone (dot + text contrast) and the
 * freshest item sits at the top of its group.
 *
 * The list is read-only for now (clicking an item does not open the
 * drawer — the table on the left is the source of truth for row
 * navigation; this is just a side audit log).
 *
 * perf: setNow از component بیرون کشیده شده — فقط RelTimeDisplay
 *       هر دقیقه re-render می‌شود، نه کل feed.
 */

import { getServiceRequestRecentActivity } from '@/actions/serviceRequestActions';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineBolt,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineInbox,
  HiOutlinePencil,
  HiOutlineXCircle,
} from 'react-icons/hi2';

type Activity =
  | {
      kind: 'created';
      id: string;
      trackingCode: string;
      fullName: string;
      status: string;
      urgency: string;
      serviceType: string;
      createdAt: string;
    }
  | {
      kind: 'status_changed';
      id: string;
      trackingCode: string;
      fromStatus: string | null;
      toStatus: string;
      updatedBy: string;
      createdAt: string;
    };

type Tone = 'created' | 'progress' | 'completed' | 'cancelled' | 'urgent';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

const SERVICE_LABEL: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'پی‌پال / اسکریل',
  MOBILE_TOPUP: 'شارژ موبایل',
  BILL_PAYMENT: 'پرداخت قبض',
  OTHER: 'سایر',
};

function getTone(item: Activity): Tone {
  if (item.kind === 'created') {
    if (item.urgency === 'URGENT') return 'urgent';
    return 'created';
  }
  switch (item.toStatus) {
    case 'IN_PROGRESS':
      return 'progress';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'progress';
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Group = {
  tone: 'today' | 'yesterday' | 'week' | 'older';
  label: string;
  items: Activity[];
};

function groupByDay(items: Activity[], now: Date): Group[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const map = new Map<string, Group>();
  for (const it of sorted) {
    const d = new Date(it.createdAt);
    let tone: Group['tone'];
    let label: string;
    if (isSameDay(d, now)) {
      tone = 'today';
      label = 'امروز';
    } else {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      if (isSameDay(d, y)) {
        tone = 'yesterday';
        label = 'دیروز';
      } else {
        const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff < 7) {
          tone = 'week';
          label = 'این هفته';
        } else {
          tone = 'older';
          label = d.toLocaleDateString('fa-IR', {
            month: 'long',
            year: 'numeric',
          });
        }
      }
    }
    const key = `${tone}-${label}`;
    if (!map.has(key)) map.set(key, { tone, label, items: [] });
    map.get(key)?.items.push(it);
  }
  return Array.from(map.values());
}

function timeAgoFa(iso: string, now: Date): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return `${minutes.toLocaleString('fa-IR')} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت پیش`;
  return `${new Date(iso).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  })}`;
}

/**
 * RelTimeDisplay — ایزوله‌کننده‌ی timer
 * فقط این component هر دقیقه re-render می‌شود، نه کل feed.
 */
function RelTimeDisplay({ iso }: { iso: string }) {
  const [now, setNow] = useState<Date>(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setNow(new Date());
    const start = () => {
      timerRef.current = setInterval(() => setNow(new Date()), 60_000);
    };
    start();
    const onVis = () => {
      if (document.hidden) {
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setNow(new Date());
        start();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);

  return <span>{timeAgoFa(iso, now)}</span>;
}

interface ServiceRequestsActivityFeedProps {
  refreshKey?: number;
}

export default function ServiceRequestsActivityFeed({
  refreshKey = 0,
}: ServiceRequestsActivityFeedProps) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  // now فقط برای groupByDay — یک بار در mount و هر بار در data refresh
  const nowRef = useRef<Date>(new Date());
  const [groupedKey, setGroupedKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional external signal prop
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await getServiceRequestRecentActivity(15);
      if (cancelled) return;
      if (result.success && result.data) {
        nowRef.current = new Date();
        setItems(result.data as Activity[]);
        setGroupedKey((k) => k + 1);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: groupedKey forces re-group when data refreshes
  const grouped = useMemo(() => groupByDay(items, nowRef.current), [items, groupedKey]);
  const total = items.length;

  return (
    <aside className="at-tile at-srq-activity" aria-label="گزارش فعالیت‌های اخیر">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineBolt className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">گزارش فعالیت</h2>
            <p className="at-head__sub">
              {loading
                ? 'در حال بارگذاری…'
                : `${total.toLocaleString('fa-IR')} مورد در ${grouped.length.toLocaleString('fa-IR')} گروه`}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="at-srq-activity__list">
          <ul className="at-srq-activity__items">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={`sk-act-${i}`}
                className="at-srq-activity__item"
                aria-hidden
                style={{ opacity: 0.6 }}
              >
                <span className="at-srq-activity__dot" style={{ background: 'var(--at-line)' }} />
                <div className="at-srq-activity__body">
                  <span
                    className="block h-3 rounded"
                    style={{
                      width: '70%',
                      background: 'var(--at-line)',
                      marginBottom: 6,
                    }}
                  />
                  <span
                    className="block h-2.5 rounded"
                    style={{
                      width: '40%',
                      background: 'var(--at-line)',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : total === 0 ? (
        <p className="at-srq-activity__empty">
          <HiOutlineInbox className="w-4 h-4 inline-block ml-1 align-middle" />
          هنوز فعالیتی ثبت نشده است.
        </p>
      ) : (
        <ol className="at-srq-activity__list">
          {grouped.map((group) => (
            <li key={`${group.tone}-${group.label}`} className="at-srq-activity__group">
              <p className={`at-srq-activity__group-label is-${group.tone}`}>
                <span>{group.label}</span>
                <span className="tabular-nums">{group.items.length.toLocaleString('fa-IR')}</span>
              </p>
              <ol className="at-srq-activity__items">
                {group.items.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function ActivityRow({ item }: { item: Activity }) {
  const tone = getTone(item);
  const isCreated = item.kind === 'created';

  // Icon pick
  const Icon = isCreated
    ? item.urgency === 'URGENT'
      ? HiOutlineExclamationCircle
      : HiOutlineClock
    : item.toStatus === 'COMPLETED'
      ? HiOutlineCheckCircle
      : item.toStatus === 'CANCELLED'
        ? HiOutlineXCircle
        : HiOutlinePencil;

  const toneClass = `is-${tone}`;

  return (
    <li className="at-srq-activity__item">
      <span className={`at-srq-activity__dot ${toneClass}`} aria-hidden />
      <div className="at-srq-activity__body">
        <p className="at-srq-activity__text">
          {isCreated ? (
            <>
              <HiOutlineClock className="w-3 h-3 inline-block ml-1 align-middle opacity-70" />
              <strong>{item.fullName}</strong> یک درخواست{' '}
              {item.urgency === 'URGENT' ? (
                <span className="at-srq-activity__code">فوری</span>
              ) : null}{' '}
              ثبت کرد
              {item.serviceType ? (
                <> برای «{SERVICE_LABEL[item.serviceType] ?? item.serviceType}»</>
              ) : null}
            </>
          ) : (
            <>
              <HiOutlineBolt className="w-3 h-3 inline-block ml-1 align-middle opacity-70" />
              <strong>{item.updatedBy.split('@')[0]}</strong> وضعیت درخواست را به «
              {STATUS_LABEL[item.toStatus] ?? item.toStatus}» تغییر داد
            </>
          )}
        </p>
        <p className="at-srq-activity__time">
          <span className="at-srq-activity__code">{item.trackingCode}</span>
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          {/* RelTimeDisplay: فقط این span هر دقیقه re-render می‌شود */}
          <RelTimeDisplay iso={item.createdAt} />
        </p>
      </div>
      <Icon className="w-4 h-4 opacity-0" aria-hidden />
    </li>
  );
}
