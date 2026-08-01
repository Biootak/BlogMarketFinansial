'use client';

/**
 * ApiActivityWidget — «نبض API» (Recent API Activity)
 * ----------------------------------------------------------------------------
 *   نمایش ۱۰ درخواست اخیر API key در داشبورد مشتری.
 *   - method badge با رنگ‌بندی semantic (GET=cyan, POST=violet, DELETE=danger, ...)
 *   - status code pill با رنگ موفقیت/خطا
 *   - زمان نسبی فارسی
 *   - اگر هیچ فعالیتی نیست → empty state با CTA به پنل توسعه
 *
 * Design DNA: token-only, RTL-first, Bento card style.
 *
 * 2026-07-29: اضافه شد به عنوان بخشی از رفع ۴ پیشنهاد (suggestion #4).
 */

import { getRecentApiActivity } from '@/actions/developer-portal';
import { Activity, ArrowUpRight, Clock, Code2, ExternalLink, Globe, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from './ApiActivityWidget.module.css';

type ApiCall = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  createdAt: string;
};

const METHOD_COLOR: Record<string, string> = {
  GET: 'cyan',
  POST: 'violet',
  PUT: 'amber',
  PATCH: 'amber',
  DELETE: 'danger',
};

const STATUS_TONE = (code: number): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'warning';
  if (code >= 400) return 'danger';
  return 'neutral';
};

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

const faTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'لحظاتی پیش';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${faNum(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${faNum(hr)} ساعت پیش`;
  const day = Math.floor(hr / 24);
  return `${faNum(day)} روز پیش`;
};

export default function ApiActivityWidget() {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await getRecentApiActivity(10)) as unknown as ApiCall[];
        if (!cancelled) {
          setCalls(data);
          setHasFetched(true);
        }
      } catch {
        if (!cancelled) setHasFetched(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasFetched) {
    return (
      <section className={s.root} aria-label="فعالیت اخیر API">
        <div className={s.skeleton} aria-hidden>
          <div className={s.skelHead} />
          <div className={s.skelRow} />
          <div className={s.skelRow} />
          <div className={s.skelRow} />
        </div>
      </section>
    );
  }

  if (calls.length === 0) {
    return (
      <section className={s.root} aria-labelledby="api-activity-title">
        <header className={s.head}>
          <div className={s.headMain}>
            <span className={s.headIcon} aria-hidden>
              <Activity size={14} />
            </span>
            <div>
              <h2 id="api-activity-title" className={s.title}>
                فعالیت اخیر API
              </h2>
              <p className={s.sub}>۱۰ درخواست اخیر کلیدهای API شما</p>
            </div>
          </div>
        </header>
        <Link href="/customer/developer" className={s.emptyCta}>
          <span className={s.emptyIcon} aria-hidden>
            <Terminal size={18} />
          </span>
          <div>
            <h3 className={s.emptyTitle}>هنوز درخواستی ثبت نشده</h3>
            <p className={s.emptyDesc}>برای شروع، یک کلید API بسازید و در سیستم خود استفاده کنید</p>
          </div>
          <span className={s.emptyArrow} aria-hidden>
            <ArrowUpRight size={14} />
          </span>
        </Link>
      </section>
    );
  }

  // Stats
  const total = calls.length;
  const successCount = calls.filter((c) => c.statusCode >= 200 && c.statusCode < 300).length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const avgDuration =
    total > 0 ? Math.round(calls.reduce((s, c) => s + c.durationMs, 0) / total) : 0;

  return (
    <section className={s.root} aria-labelledby="api-activity-title">
      <header className={s.head}>
        <div className={s.headMain}>
          <span className={s.headIcon} aria-hidden>
            <Activity size={14} />
          </span>
          <div>
            <h2 id="api-activity-title" className={s.title}>
              فعالیت اخیر API
            </h2>
            <p className={s.sub}>۱۰ درخواست اخیر کلیدهای API شما</p>
          </div>
        </div>
        <Link href="/customer/developer" className={s.headCta}>
          پنل توسعه
          <ExternalLink size={10} aria-hidden />
        </Link>
      </header>

      <div className={s.statsRow}>
        <div className={s.statBox}>
          <span className={s.statLabel}>کل درخواست‌ها</span>
          <span className={s.statValue}>{faNum(total)}</span>
        </div>
        <span className={s.statDivider} aria-hidden />
        <div className={s.statBox}>
          <span className={s.statLabel}>نرخ موفقیت</span>
          <span className={s.statValue} data-tone="success">
            {faNum(successRate)}٪
          </span>
        </div>
        <span className={s.statDivider} aria-hidden />
        <div className={s.statBox}>
          <span className={s.statLabel}>میانگین پاسخ</span>
          <span className={s.statValue}>
            {faNum(avgDuration)}
            <span className={s.statUnit}>ms</span>
          </span>
        </div>
      </div>

      <ul className={s.callList}>
        {calls.map((c) => {
          const methodColor = METHOD_COLOR[c.method] ?? 'neutral';
          const tone = STATUS_TONE(c.statusCode);
          return (
            <li key={c.id} className={s.callItem}>
              <span className={s.methodBadge} data-color={methodColor}>
                {c.method}
              </span>
              <code className={s.path} dir="ltr" title={c.path}>
                {c.path}
              </code>
              <span className={s.statusPill} data-tone={tone}>
                {faNum(c.statusCode)}
              </span>
              <span className={s.duration}>
                <Clock size={9} aria-hidden />
                {faNum(c.durationMs)}ms
              </span>
              <span className={s.time}>{faTime(c.createdAt)}</span>
            </li>
          );
        })}
      </ul>

      <footer className={s.foot}>
        <span className={s.footItem}>
          <Globe size={10} aria-hidden />
          <code dir="ltr">
            {(process.env.NEXT_PUBLIC_APP_URL ?? 'financialmarket.page').replace(
              /^https?:\/\//,
              '',
            )}
            /api/v1
          </code>
        </span>
        <Link href="/customer/developer" className={s.footLink}>
          <Code2 size={10} aria-hidden />
          مستندات کامل
        </Link>
      </footer>
    </section>
  );
}
