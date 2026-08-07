'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { type ToneKey, bucketLabel, faNum, faPercent, msShort, sourceName } from './format';
import l from './ledger.module.css';
import { readHealth } from './obsHealth';

interface Finding {
  id: string;
  tone: ToneKey;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}

/** فوریت تُن — مرتب‌سازی یافته‌ها بر همین اساس است. */
const URGENCY: Record<ToneKey, number> = { bad: 0, warn: 1, info: 2, idle: 3, ok: 4 };

const MAX_FINDINGS = 5;

/**
 * یافته‌های خودکار.
 *
 * قاعدهٔ سخت: هر یافته باید از یک عدد واقعی در snapshot مشتق شده باشد و یک
 * مسیر بررسی داشته باشد. هیچ توصیهٔ عمومی و هیچ «بهتر است بررسی کنید» بدون
 * پشتوانهٔ عددی اینجا نمی‌آید؛ داشبوردی که نصیحت می‌کند اعتماد را می‌سوزاند.
 */
export function InsightStack() {
  const { data } = useObs();

  if (!data) {
    return (
      <ObsEmpty
        icon={Sparkles}
        title="یافته‌ای در دست نیست"
        hint="یافته‌ها از روی همان snapshot ساخته می‌شوند؛ تا اولین خوانش نرسد چیزی برای گفتن نداریم."
      />
    );
  }

  const health = readHealth(data);
  const findings: Finding[] = [];

  const down = data.services.filter((service) => service.status === 'down');
  if (down.length > 0) {
    findings.push({
      id: 'down',
      tone: 'bad',
      title: `${faNum(down.length)} سرویس خارج از سرویس`,
      body: `${down.map((service) => service.name).join('، ')} در پانزده دقیقهٔ اخیر بیش از آستانه خطا داده‌اند.`,
      href: '/dashboard/observability/services',
      cta: 'نردبان سرویس‌ها',
    });
  }

  const degraded = data.services.filter((service) => service.status === 'degraded');
  if (degraded.length > 0) {
    findings.push({
      id: 'degraded',
      tone: 'warn',
      title: `${faNum(degraded.length)} سرویس کند شده`,
      body: `${degraded.map((service) => service.name).join('، ')} هنوز پاسخ می‌دهند ولی نرخ خطا یا هشدارشان از حالت عادی بالاتر است.`,
      href: '/dashboard/observability/services',
      cta: 'مقایسهٔ سرویس‌ها',
    });
  }

  // «سکوت» یک وضعیت است نه سلامت. اگر هیچ رکوردی نیامده باشد، هیچ عدد دیگری
  // روی این صفحه قابل استناد نیست و باید صریح گفته شود.
  if (health.silent) {
    findings.push({
      id: 'silent',
      tone: 'idle',
      title: 'جمع‌آورندهٔ لاگ ساکت است',
      body: `در ${faNum(data.windowHours)} ساعت گذشته حتی یک رکورد در SystemLog ثبت نشده. یا ترافیکی نبوده یا نویسندهٔ لاگ از کار افتاده — تا روشن شدن این نکته هیچ عددی روی این صفحه قابل استناد نیست.`,
    });
  }

  const noisiest = [...data.sources].sort((a, b) => b.errors - a.errors)[0];
  if (noisiest && noisiest.errors > 0) {
    const share = noisiest.total > 0 ? (noisiest.errors / noisiest.total) * 100 : 0;
    findings.push({
      id: 'noisy-source',
      tone: share > 10 ? 'bad' : 'warn',
      title: `بیشترین خطا از ${sourceName(noisiest.source)}`,
      body: `${faNum(noisiest.errors)} خطا از ${faNum(noisiest.total)} رویداد همین منبع، یعنی ${faPercent(share)} از ترافیک خودش.`,
      href: '/dashboard/observability/errors',
      cta: 'دفتر خطا',
    });
  }

  const worstIncident = [...data.incidents].sort((a, b) => b.peak - a.peak)[0];
  if (worstIncident) {
    findings.push({
      id: 'incident',
      tone: 'warn',
      title: `${faNum(data.incidents.length)} پنجرهٔ بحرانی در این بازه`,
      body: `سنگین‌ترین بازه ${bucketLabel(data.generatedAt, worstIncident.fromHour, data.windowHours)} بود، با اوج ${faNum(worstIncident.peak)} خطا در ساعت.`,
      href: '/dashboard/observability/errors',
      cta: 'بررسی پنجره‌ها',
    });
  }

  const worstQuery = data.slowQueries[0];
  if (worstQuery && worstQuery.durationMs >= 500) {
    findings.push({
      id: 'slow-query',
      tone: worstQuery.durationMs >= 1000 ? 'bad' : 'warn',
      title: `کندترین مسیر ${msShort(worstQuery.durationMs)} طول کشیده`,
      body: `منبع ${sourceName(worstQuery.source)}؛ هر مسیری که از یک ثانیه رد شود، در ساعت اوج به صف تبدیل می‌شود.`,
      href: '/dashboard/observability/queries',
      cta: 'کوئری‌های کند',
    });
  }

  if (data.performance.latencySource === 'derived') {
    findings.push({
      id: 'derived-latency',
      tone: 'idle',
      title: 'صدک‌های تأخیر تخمینی‌اند',
      body: 'در ساعت اخیر هیچ لاگی با کلید duration ثبت نشده، پس p50 و p95 و p99 مشتق‌شده‌اند نه اندازه‌گیری‌شده.',
      href: '/dashboard/observability/latency',
      cta: 'محور تأخیر',
    });
  }

  if (data.totals.sampled) {
    findings.push({
      id: 'sampled',
      tone: 'warn',
      title: 'اعداد این پنجره نمونه‌ای هستند',
      body: 'حجم لاگ به سقف اسکن رسیده است؛ مجموع‌ها کف واقعی‌اند نه عدد دقیق. برای عدد دقیق باید بازه را کوتاه‌تر کرد.',
    });
  }

  if (!health.silent) {
    findings.push({
      id: 'rhythm',
      tone: 'info',
      title: 'ریتم شبانه‌روز',
      body: `اوج ترافیک ${bucketLabel(data.generatedAt, health.peakHour, data.windowHours)} با ${faNum(health.peakValue)} رویداد بود و سهم خطا از کل پنجره ${faPercent(health.errorShare, 2)} است.`,
      href: '/dashboard/observability/latency',
      cta: 'نوار روز',
    });
  }

  if (findings.length === 0) {
    return (
      <ObsEmpty
        icon={Sparkles}
        title="چیزی برای رسیدگی نیست"
        hint="در پنجرهٔ جاری نه سرویسی افتاده، نه پنجرهٔ بحرانی ثبت شده و نه مسیر کندی از آستانه رد شده است."
      />
    );
  }

  const ordered = findings.sort((a, b) => URGENCY[a.tone] - URGENCY[b.tone]).slice(0, MAX_FINDINGS);

  return (
    <ol className={l.insights}>
      {ordered.map((finding) => (
        <li key={finding.id}>
          <div className={l.insight} data-tone={finding.tone}>
            <span className={l.insightMark} aria-hidden="true" />
            <p className={l.insightTitle}>{finding.title}</p>
            <p className={l.insightBody}>{finding.body}</p>
            {finding.href && finding.cta ? (
              <Link href={finding.href} className={l.insightLink}>
                {finding.cta}
                <ArrowLeft size={13} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
