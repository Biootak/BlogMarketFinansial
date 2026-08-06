'use client';

/**
 * ErrorBoard — بخش «خطا و رخداد».
 * ─────────────────────────────────────────────────────────────
 *  سه ناحیه: پنجره‌های رخداد (incident) که خودِ lib از انفجار خطا تشخیص
 *  می‌دهد، جریان خطای گروه‌بندی‌شده، و رد ممیزی AuditLog.
 *
 *  فیلترها واقعی‌اند: روی همان آرایه‌ای که از API آمده اعمال می‌شوند و
 *  شمارنده‌ها از داده ساخته می‌شوند، نه از لیست ثابت.
 */

import { AlertTriangle, ScrollText, ShieldCheck, Siren } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { SearchInput } from '@/components/Dashboard/primitives/SearchInput';
import type { Incident, ObservabilitySnapshot } from '@/lib/observability';
import { LiveBar } from './LiveBar';
import {
  cssVars,
  formatNumber,
  formatTimeAgo,
  hourKey,
  hourOffsetLabel,
  levelLabel,
  levelTone,
  toneVar,
} from './format';
import { useObservabilityFeed } from './useObservabilityFeed';
import s from './ErrorBoard.module.css';

const ALL = 'all';

interface Props {
  initialData: ObservabilitySnapshot;
}

interface RangeCell {
  key: string;
  inside: boolean;
}

function rangeCells(incident: Incident, buckets: number): RangeCell[] {
  return Array.from({ length: buckets }, (_, index) => ({
    key: hourKey(index),
    inside: index >= incident.fromHour && index <= incident.toHour,
  }));
}

export function ErrorBoard({ initialData }: Props) {
  const { data, now, status, refresh } = useObservabilityFeed(initialData);
  const [level, setLevel] = useState<string>(ALL);
  const [query, setQuery] = useState<string>('');

  const levelOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of data.errors) {
      counts.set(event.level, (counts.get(event.level) ?? 0) + event.count);
    }
    return Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
  }, [data.errors]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.errors.filter((event) => {
      if (level !== ALL && event.level !== level) return false;
      if (needle.length === 0) return true;
      return (
        event.message.toLowerCase().includes(needle) ||
        event.source.toLowerCase().includes(needle)
      );
    });
  }, [data.errors, level, query]);

  const totalEvents = data.errors.reduce((sum, event) => sum + event.count, 0);
  const buckets = data.hourlyErrors.length;

  return (
    <div className={s.board}>
      <LiveBar
        generatedAt={data.generatedAt}
        now={now}
        status={status}
        onRefresh={refresh}
        sampled={data.totals.sampled}
      >
        <span className={s.chips}>
          <span className={s.chip} data-strong="true">
            {formatNumber(totalEvents)} رویداد خطا
          </span>
          <span className={s.chip}>{formatNumber(data.errors.length)} گروه یکتا</span>
          <span className={s.chip}>{formatNumber(data.incidents.length)} پنجرهٔ رخداد</span>
        </span>
      </LiveBar>

      <section className={s.panel} aria-labelledby="obs-incidents">
        <header className={s.panelHead}>
          <h2 id="obs-incidents" className={s.panelTitle}>
            <Siren size={15} strokeWidth={1.75} aria-hidden />
            پنجره‌های رخداد
          </h2>
          <p className={s.panelCaption}>
            بازه‌های پیوسته‌ای که نرخ خطا در آن‌ها بیش از سه برابر میانگین ۲۴ ساعت بوده است.
          </p>
        </header>

        {data.incidents.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="هیچ پنجرهٔ رخدادی شناسایی نشد"
            description="نرخ خطا در تمام ۲۴ ساعت گذشته زیر آستانهٔ هشدار مانده است."
          />
        ) : (
          <ul className={s.incidents}>
            {data.incidents.map((incident) => (
              <li key={incident.id} className={s.incident}>
                <div className={s.incidentHead}>
                  <span className={s.incidentRange}>
                    {hourOffsetLabel(buckets - 1 - incident.toHour)} تا{' '}
                    {hourOffsetLabel(buckets - 1 - incident.fromHour)}
                  </span>
                  <span className={s.incidentMetrics}>
                    <span className={s.incidentValue}>{formatNumber(incident.errors)}</span> خطا ·
                    اوج <span className={s.incidentValue}>{formatNumber(incident.peak)}</span> در ساعت
                  </span>
                </div>
                <div className={s.rangeStrip} aria-hidden>
                  {rangeCells(incident, buckets).map((cell) => (
                    <span key={cell.key} className={s.rangeCell} data-inside={cell.inside} />
                  ))}
                </div>
                {incident.sources.length > 0 ? (
                  <p className={s.incidentSources}>
                    منابع درگیر:{' '}
                    {incident.sources.map((source) => (
                      <span key={source} className={s.tag} dir="ltr">
                        {source}
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={s.panel} aria-labelledby="obs-stream">
        <header className={s.panelHead}>
          <h2 id="obs-stream" className={s.panelTitle}>
            <AlertTriangle size={15} strokeWidth={1.75} aria-hidden />
            جریان خطا
          </h2>
          <p className={s.panelCaption}>
            پیام‌های یکسان گروه شده‌اند؛ عدد کنار هر ردیف یعنی چند بار تکرار شده است.
          </p>
        </header>

        <div className={s.filters}>
          <div className={s.levelChips} role="group" aria-label="صافی سطح خطا">
            <button
              type="button"
              className={s.levelChip}
              data-active={level === ALL}
              onClick={() => setLevel(ALL)}
            >
              همه
              <span className={s.chipCount}>{formatNumber(totalEvents)}</span>
            </button>
            {levelOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={s.levelChip}
                data-active={level === option.key}
                style={cssVars({ '--tone': toneVar(levelTone(option.key)) })}
                onClick={() => setLevel(option.key)}
              >
                {levelLabel(option.key)}
                <span className={s.chipCount}>{formatNumber(option.count)}</span>
              </button>
            ))}
          </div>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="جست‌وجو در پیام یا منبع"
            ariaLabel="جست‌وجو در جریان خطا"
            className={s.search}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={
              data.errors.length === 0
                ? 'هیچ خطایی در ۲۴ ساعت گذشته ثبت نشده است'
                : 'هیچ ردیفی با این صافی مطابقت ندارد'
            }
            description={
              data.errors.length === 0
                ? 'سطح error و fatal در SystemLog خالی است.'
                : 'عبارت جست‌وجو یا سطح انتخاب‌شده را تغییر دهید.'
            }
          />
        ) : (
          <ol className={s.stream}>
            {filtered.map((event) => (
              <li
                key={event.id}
                className={s.event}
                style={cssVars({ '--tone': toneVar(levelTone(event.level)) })}
              >
                <span className={s.level}>{levelLabel(event.level)}</span>
                <span className={s.source} dir="ltr">
                  {event.source}
                </span>
                <span className={s.message} dir="ltr">
                  {event.message}
                </span>
                {event.count > 1 ? (
                  <span className={s.repeat}>{formatNumber(event.count)}×</span>
                ) : null}
                <time className={s.time} dateTime={event.timestamp}>
                  {formatTimeAgo(event.timestamp, now)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={s.panel} aria-labelledby="obs-audit">
        <header className={s.panelHead}>
          <h2 id="obs-audit" className={s.panelTitle}>
            <ScrollText size={15} strokeWidth={1.75} aria-hidden />
            رد ممیزی
          </h2>
          <p className={s.panelCaption}>
            {formatNumber(data.totals.audit)} رویداد ممیزی در ۲۴ ساعت گذشته — تازه‌ترین‌ها اینجا.
          </p>
        </header>

        {data.audit.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="رد ممیزی خالی است"
            description="هیچ عملیات حساسی در ۲۴ ساعت گذشته ثبت نشده است."
          />
        ) : (
          <ul className={s.audit}>
            {data.audit.map((entry) => (
              <li key={entry.id} className={s.auditRow}>
                <span className={s.auditAction} dir="ltr">
                  {entry.action}
                </span>
                <span className={s.auditEntity} dir="ltr">
                  {entry.entityType}
                </span>
                <span className={s.auditRole}>{entry.actorRole}</span>
                <time className={s.time} dateTime={entry.createdAt}>
                  {formatTimeAgo(entry.createdAt, now)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
