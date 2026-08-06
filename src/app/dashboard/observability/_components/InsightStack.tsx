'use client';

import {
  ArrowUpLeft,
  Clock3,
  Database,
  Gauge,
  Radio,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { bucketLabel, faNum, faPercent, msShort, statusLabel, toFa, type ToneKey } from './format';
import { readHealth } from './obsHealth';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import d from './deck.module.css';

interface Finding {
  id: string;
  icon: LucideIcon;
  tone: ToneKey;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}

/** وزن تُن برای مرتب‌سازی — بحرانی‌ها همیشه بالای فهرست. */
const WEIGHT: Record<ToneKey, number> = { bad: 0, warn: 1, info: 2, ok: 3, idle: 4 };

/**
 * یافته‌های خودکار.
 *
 * هیچ‌کدام متن ثابت یا نمونهٔ نمایشی نیست؛ هر جمله از همان snapshot دیتابیس
 * ساخته می‌شود و اگر شرطش برقرار نباشد اصلاً رندر نمی‌شود.
 *
 * تازه در این نسخه: یافته‌ها بر اساس شدت مرتب می‌شوند و رتبهٔ عددی می‌گیرند،
 * پس ترتیب خواندن قطعی است نه تابع ترتیب کدنویسی. هدف: کاربر به‌جای خواندن
 * پنج نمودار، در ده ثانیه بفهمد کجا را نگاه کند.
 */
export function InsightStack() {
  const { data } = useObs();
  if (!data) return null;

  const health = readHealth(data);
  const findings: Finding[] = [];

  if (health.silent) {
    findings.push({
      id: 'silent',
      icon: Radio,
      tone: 'idle',
      title: 'جمع‌آورندهٔ لاگ ساکت است',
      body: `در ${faNum(data.windowHours)} ساعت گذشته حتی یک رکورد در SystemLog ثبت نشده. یا ترافیکی نبوده یا نویسندهٔ لاگ از کار افتاده — تا روشن شدن این نکته هیچ عددی روی این صفحه قابل استناد نیست.`,
    });
  }

  const worstService = [...data.services]
    .filter((service) => service.status === 'down' || service.status === 'degraded')
    .sort((a, b) => b.errors24h - a.errors24h)[0];

  if (worstService) {
    findings.push({
      id: `service-${worstService.id}`,
      icon: ServerCrash,
      tone: worstService.status === 'down' ? 'bad' : 'warn',
      title: `${worstService.name} ${statusLabel(worstService.status)} است`,
      body: `${faNum(worstService.errors24h)} خطا از ${faNum(worstService.events24h)} رویداد در پنجرهٔ جاری، با تأخیر ${msShort(worstService.latencyMs)} و در دسترس بودن ${faPercent(worstService.uptime24h, 2)}.`,
      href: `/dashboard/observability/services/${worstService.id}`,
      cta: 'کارنامهٔ سرویس',
    });
  }

  const noisiest = [...data.sources]
    .filter((item) => item.errors > 0)
    .sort((a, b) => b.errors - a.errors)[0];

  if (noisiest) {
    findings.push({
      id: `source-${noisiest.source}`,
      icon: Siren,
      tone: 'bad',
      title: `منبع ${noisiest.source} پرخطاترین است`,
      body: `${faNum(noisiest.errors)} خطا در ${faNum(noisiest.total)} رویداد، یعنی ${faPercent((noisiest.errors / Math.max(noisiest.total, 1)) * 100)} از ترافیک خودش و ${faPercent(noisiest.share)} از کل حجم پنجره.`,
      href: '/dashboard/observability/errors',
      cta: 'دفتر خطا',
    });
  }

  if (data.incidents.length > 0) {
    const worst = [...data.incidents].sort((a, b) => b.errors - a.errors)[0];
    if (worst) {
      findings.push({
        id: `incident-${worst.id}`,
        icon: Siren,
        tone: 'warn',
        title: `${faNum(data.incidents.length)} پنجرهٔ بحرانی در این شبانه‌روز`,
        body: `شدیدترین‌شان ${faNum(worst.errors)} خطا در بازهٔ ${bucketLabel(data.generatedAt, worst.fromHour, data.windowHours).slice(0, 5)} تا ${bucketLabel(data.generatedAt, worst.toHour, data.windowHours).slice(-5)} با اوج ${faNum(worst.peak)} خطا در ساعت.`,
        href: '/dashboard/observability/errors',
        cta: 'پنجره‌های بحرانی',
      });
    }
  }

  if (!health.silent && health.peakValue > 0) {
    findings.push({
      id: 'peak',
      icon: Clock3,
      tone: 'info',
      title: 'شلوغ‌ترین ساعت شبانه‌روز',
      body: `بازهٔ ${bucketLabel(data.generatedAt, health.peakHour, data.windowHours)} با ${faNum(health.peakValue)} رویداد، برابر ${faPercent((health.peakValue / Math.max(data.totals.logs, 1)) * 100)} کل حجم پنجره. ظرفیت را برای همین ساعت بچینید نه برای میانگین.`,
      href: '/dashboard/observability/latency',
      cta: 'بار سامانه',
    });
  }

  const worstQuery = data.slowQueries[0];
  if (worstQuery && worstQuery.durationMs > 0) {
    findings.push({
      id: 'slow',
      icon: Database,
      tone: worstQuery.durationMs >= 1000 ? 'bad' : 'warn',
      title: `کندترین مسیر ${msShort(worstQuery.durationMs)} طول کشیده`,
      body: `منبع ${worstQuery.source} — ${worstQuery.message.slice(0, 120)}`,
      href: '/dashboard/observability/queries',
      cta: 'کوئری‌های کند',
    });
  }

  findings.push(
    data.performance.latencySource === 'measured'
      ? {
          id: 'latency',
          icon: Gauge,
          tone: 'ok',
          title: 'صدک‌های تأخیر اندازه‌گیری‌شده‌اند',
          body: `از ${faNum(data.performance.latencySamples)} نمونهٔ واقعی duration در یک ساعت اخیر: p50 برابر ${msShort(data.performance.p50)} و p99 برابر ${msShort(data.performance.p99)}.`,
          href: '/dashboard/observability/latency',
          cta: 'محور صدک‌ها',
        }
      : {
          id: 'latency',
          icon: Gauge,
          tone: 'warn',
          title: 'صدک‌های تأخیر مشتق‌شده‌اند',
          body: 'هنوز نمونهٔ کافی duration در لاگ‌ها نیست، پس این اعداد از حجم و نرخ خطا استنتاج شده‌اند نه اندازه‌گیری مستقیم. الگوی duration=<ms> را در مسیرهای داغ لاگ کنید تا اعداد واقعی شوند.',
          href: '/dashboard/observability/latency',
          cta: 'محور صدک‌ها',
        },
  );

  if (data.totals.sampled) {
    findings.push({
      id: 'sampled',
      icon: ShieldAlert,
      tone: 'warn',
      title: 'به سقف اسکن خورده‌ایم',
      body: 'حجم لاگ پنجره از سقف امنِ اسکن گذشته، پس اعداد نمونه‌ای از تازه‌ترین رکوردهاست نه شمارش کامل. برای دقت بیشتر بازهٔ نگه‌داری لاگ را کوتاه‌تر کنید.',
    });
  }

  if (findings.length === 0) {
    return (
      <ObsEmpty
        icon={ShieldCheck}
        title="یافتهٔ قابل اقدامی نیست"
        hint="وقتی سرویسی کند شود، منبعی خطا بدهد یا کوئری کندی ثبت گردد، همین‌جا با عدد و لینکِ مقصد خلاصه می‌شود."
      />
    );
  }

  const ranked = findings
    .sort((a, b) => WEIGHT[a.tone] - WEIGHT[b.tone])
    .slice(0, 6);

  return (
    <ol className={`${d.insights} stagger-children`}>
      {ranked.map((finding, index) => {
        const Icon = finding.icon;
        return (
          <li key={finding.id} className={d.insight} data-tone={finding.tone}>
            <span className={d.insightRank} aria-hidden="true">
              {toFa(String(index + 1))}
            </span>

            <span className={d.insightIcon} aria-hidden="true">
              <Icon size={16} strokeWidth={1.5} />
            </span>

            <div className={d.insightBody}>
              <p className={d.insightTitle}>{finding.title}</p>
              <p className={d.insightText}>{finding.body}</p>
              {finding.href && finding.cta ? (
                <Link className={d.insightLink} href={finding.href}>
                  {finding.cta}
                  <ArrowUpLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
