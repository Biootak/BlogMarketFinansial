'use client';

import { ArrowUpLeft, Database, Gauge, ScrollText, ServerOff, Siren } from 'lucide-react';
import Link from 'next/link';

import {
  bucketLabel,
  cssVars,
  faNum,
  faPercent,
  hourKey,
  levelLabel,
  levelTone,
  msShort,
  relative,
  statusLabel,
  statusTone,
} from './format';
import { MeterBar } from './MeterBar';
import { useObs } from './ObsProvider';
import { ObsEmpty, ObsSection } from './ObsSection';
import { Sparkline } from './Sparkline';
import { StatusGlyph } from './StatusGlyph';
import b from './boards.module.css';
import s from './obs.module.css';

/**
 * کارنامهٔ یک سرویس — زیرمسیر تازهٔ `/services/[service]`.
 *
 * چرا لازم بود: نردبان سرویس‌ها «کدام سرویس بدحال است» را می‌گفت ولی مقصدِ
 * بعدی‌اش صفحه‌های عمومی داشبورد بود؛ یعنی زنجیرهٔ تشخیص وسطِ راه قطع می‌شد.
 *
 * هیچ دادهٔ تازه‌ای از سرور خوانده نمی‌شود: همه‌چیز از همان snapshot موجود در
 * ObsProvider (که در layout زندگی می‌کند) فیلتر می‌شود — نه fetch اضافه، نه
 * عدد ساختگی. اگر شناسهٔ مسیر با هیچ سرویسی نخواند، حالت خالیِ صادقانه.
 */
export function ServiceDetail({ id }: { id: string }) {
  const { data, hour, windowHours } = useObs();

  const service = data?.services.find((item) => item.id === id);

  if (!data || !service) {
    return (
      <ObsSection
        className={b.wide}
        icon={ServerOff}
        index={1}
        title="سرویسی با این شناسه نداریم"
        hint="شناسهٔ مسیر با هیچ سرویس تعریف‌شده‌ای در زیرساخت نخواند."
      >
        <ObsEmpty
          icon={ServerOff}
          title={`«${id}» شناخته نشد`}
          hint="از نردبان سرویس‌ها یکی را انتخاب کنید؛ فهرست از تعریف زیرساخت می‌آید و همیشه به‌روز است."
        />
      </ObsSection>
    );
  }

  const tone = statusTone(service.status);
  const heatRow = data.heat.find((row) => row.source === service.id);
  const sourceStat = data.sources.find((row) => row.source === service.id);
  const ownErrors = data.errors.filter((row) => row.source === service.id);
  const ownQueries = data.slowQueries.filter((row) => row.source === service.id);

  const marks = heatRow
    ? heatRow.cells.reduce<number[]>((acc, cell, index) => {
        if (cell.errors > 0) acc.push(index);
        return acc;
      }, [])
    : [];

  const cellMax = Math.max(1, ...(heatRow?.cells.map((cell) => cell.total) ?? [0]));
  const errorShare =
    service.events24h > 0 ? (service.errors24h / service.events24h) * 100 : 0;

  return (
    <>
      <ObsSection
        className={b.eight}
        icon={Gauge}
        index={1}
        tone={tone}
        title={`کارنامهٔ ${service.name}`}
        hint={service.desc}
        actions={
          <Link href={service.href} className={s.actionLink}>
            مسیر عملیاتی
            <ArrowUpLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        }
      >
        <div className={s.detail}>
          <p className={s.detailVerdict} data-tone={tone}>
            <StatusGlyph tone={tone} emphasis={tone === 'bad'} />
            <b>{statusLabel(service.status)}</b>
            <span>
              وضعیت از لاگ‌های همین منبع در پانزده دقیقهٔ اخیر محاسبه شده است، نه از ping.
            </span>
          </p>

          <dl className={s.detailStats}>
            <div className={s.detailStat}>
              <dt>تأخیر</dt>
              <dd>{msShort(service.latencyMs)}</dd>
            </div>
            <div className={s.detailStat}>
              <dt>در دسترس بودن</dt>
              <dd>{faPercent(service.uptime24h, 2)}</dd>
            </div>
            <div className={s.detailStat} data-tone={service.errors24h > 0 ? 'bad' : 'ok'}>
              <dt>خطای پنجره</dt>
              <dd>{faNum(service.errors24h)}</dd>
            </div>
            <div className={s.detailStat}>
              <dt>رویداد پنجره</dt>
              <dd>{faNum(service.events24h)}</dd>
            </div>
            <div className={s.detailStat} data-tone={errorShare > 2 ? 'warn' : 'idle'}>
              <dt>سهم خطا از ترافیک خود</dt>
              <dd>{faPercent(errorShare)}</dd>
            </div>
            <div className={s.detailStat}>
              <dt>خطا در دقیقه</dt>
              <dd>{faNum(service.errorRate)}</dd>
            </div>
          </dl>

          <div className={s.detailFlow}>
            <p className={s.detailFlowHead}>حجم رویداد همین سرویس در شبانه‌روز</p>
            <Sparkline
              values={service.sparkline}
              marks={marks}
              height={40}
              className={s.detailSpark}
            />

            {heatRow ? (
              <div className={s.detailCells} aria-hidden="true">
                {heatRow.cells.map((cell, index) => (
                  <span
                    key={hourKey(index)}
                    className={s.detailCell}
                    data-error={cell.errors > 0}
                    data-active={index === hour}
                    style={cssVars({ '--level': Math.round((cell.total / cellMax) * 100) })}
                    title={`${bucketLabel(data.generatedAt, index, windowHours)} · ${faNum(cell.total)} رویداد`}
                  />
                ))}
              </div>
            ) : null}

            <p className={s.detailNote}>
              مکان‌نمای ساعت روی{' '}
              <b>{bucketLabel(data.generatedAt, hour, windowHours)}</b> قفل است؛ خانهٔ روشن همان
              بازه است.
            </p>
          </div>
        </div>
      </ObsSection>

      <ObsSection
        className={b.four}
        icon={ScrollText}
        index={2}
        title="سهم از ترافیک سامانه"
        hint="همان سطری که در تفکیک منابع می‌بینید، این‌بار فقط برای این سرویس."
      >
        {sourceStat ? (
          <dl className={s.rows}>
            <div className={s.row}>
              <dt className={s.rowKey}>سهم از کل حجم پنجره</dt>
              <dd className={s.rowVal}>{faPercent(sourceStat.share)}</dd>
            </div>
            <div className={s.row}>
              <dt className={s.rowKey}>هشدار</dt>
              <dd className={s.rowVal} data-tone={sourceStat.warns > 0 ? 'warn' : 'ok'}>
                {faNum(sourceStat.warns)}
              </dd>
            </div>
            <div className={s.row}>
              <dt className={s.rowKey}>آخرین رکورد</dt>
              <dd className={s.rowVal}>{relative(sourceStat.lastAt, data.generatedAt)}</dd>
            </div>
            <div className={s.rowFull}>
              <MeterBar value={Math.min(100, sourceStat.share)} tone={tone} weight="bold" />
            </div>
          </dl>
        ) : (
          <ObsEmpty
            icon={ScrollText}
            title="این سرویس در پنجرهٔ جاری لاگی ننوشته"
            hint="یعنی یا ترافیکی نداشته یا با نام source دیگری لاگ می‌نویسد. وضعیتش «بی‌ترافیک» است، نه سالم."
          />
        )}
      </ObsSection>

      <ObsSection
        className={b.seven}
        icon={Siren}
        index={3}
        title="خطاهای همین سرویس"
        hint="فقط رکوردهای error و fatal با همین source، گروه‌شده و به‌ترتیب زمان."
      >
        {ownErrors.length === 0 ? (
          <ObsEmpty
            icon={Siren}
            title="خطایی از این سرویس ثبت نشده"
            hint="در پنجرهٔ جاری هیچ رکورد error یا fatal با این source وجود ندارد."
          />
        ) : (
          <ol className={s.ledger}>
            {ownErrors.map((item) => {
              const levelKey = levelTone(item.level);
              return (
                <li key={item.id} className={s.ledgerRow} data-tone={levelKey}>
                  <span className={s.level}>
                    <StatusGlyph tone={levelKey} />
                    {levelLabel(item.level)}
                  </span>
                  <span className={s.message}>{item.message}</span>
                  <span className={s.count} data-hot={item.count > 1}>
                    {item.count > 1 ? `${faNum(item.count)} بار` : 'یک‌بار'}
                  </span>
                  <span className={s.time}>{relative(item.timestamp, data.generatedAt)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </ObsSection>

      <ObsSection
        className={b.five}
        icon={Database}
        index={4}
        title="مسیرهای کند همین سرویس"
        hint="رکوردهای duration= یا [slow] با همین source در شش ساعت اخیر."
      >
        {ownQueries.length === 0 ? (
          <ObsEmpty
            icon={Database}
            title="کندی‌ای ثبت نشده"
            hint="برای اینکه این بخش پر شود، در مسیرهای داغ این سرویس الگوی duration=<ms> را لاگ کنید."
          />
        ) : (
          <ul className={s.miniList}>
            {ownQueries.map((item) => (
              <li key={item.id} className={s.miniRow} data-tone={item.durationMs >= 1000 ? 'bad' : 'warn'}>
                <span className={s.duration}>{msShort(item.durationMs)}</span>
                <span className={s.message}>{item.message}</span>
                <span className={s.time}>{relative(item.timestamp, data.generatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </ObsSection>
    </>
  );
}
