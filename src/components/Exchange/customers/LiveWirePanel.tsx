/**
 * LiveWirePanel — نوار marquee از آخرین فعالیت‌ها.
 *
 * signature moment cockpit: scrolling marquee بی‌صدا در پایین صفحه.
 * محتوا: تلفیق status pulse + last 14d growth.
 */

import type { CustomerActivityPulse } from '@/actions/exchange-customers';
import { ArrowDownRight, ArrowUpRight, Minus, Radio } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatCompact, formatNumber } from '@/lib/customer-format';
import s from './LiveWirePanel.module.css';

interface Props {
  pulse: CustomerActivityPulse;
  currency: string;
}

interface Wire {
  id: string;
  label: string;
  value: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'muted';
  hint?: string;
}

export function LiveWirePanel({ pulse, currency }: Props) {
  const wires: Wire[] = [];

  // status signals
  wires.push({
    id: 'total14d',
    label: 'تراکنش ۱۴ روز',
    value: formatNumber(pulse.total14d),
    tone: pulse.growthPct > 0 ? 'emerald' : pulse.growthPct < 0 ? 'rose' : 'muted',
    hint:
      pulse.growthPct > 0
        ? `↑ ${formatNumber(Math.abs(pulse.growthPct))}٪ نسبت به ۱۴ روز قبل`
        : pulse.growthPct < 0
          ? `↓ ${formatNumber(Math.abs(pulse.growthPct))}٪ نسبت به ۱۴ روز قبل`
          : '— بدون تغییر',
  });

  // daily samples
  for (let i = 0; i < pulse.daily.length; i++) {
    const d = pulse.daily[i];
    if (!d) continue;
    if (d.count === 0) continue;
    const prev = i > 0 ? pulse.daily[i - 1] : null;
    const dir =
      !prev || prev.count === 0
        ? 'flat'
        : d.count > prev.count
          ? 'up'
          : d.count < prev.count
            ? 'down'
            : 'flat';
    wires.push({
      id: `d-${d.dayLabel}`,
      label: `روز ${d.dayLabel}`,
      value: `${formatNumber(d.count)} tx`,
      tone: dir === 'up' ? 'emerald' : dir === 'down' ? 'rose' : 'muted',
      hint: dir === 'up' ? '↑ افزایش' : dir === 'down' ? '↓ کاهش' : '— ثابت',
    });
  }

  // volume proxy (sum)
  const totalVolume = pulse.daily.reduce<number>((acc, d) => {
    const raw = d.volume && /^[0-9]+$/.test(d.volume) ? BigInt(d.volume) : BigInt(0);
    return acc + Number(raw / BigInt(100));
  }, 0);
  if (totalVolume > 0) {
    wires.push({
      id: 'volume',
      label: `حجم کل ${currency}`,
      value: `${formatCompact(totalVolume)} ${currency}`,
      tone: 'emerald',
    });
  }

  if (wires.length === 0) {
    return (
      <div className={s.empty} role="status">
        <Radio size={14} aria-hidden />
        <span>هنوز فعالیتی ثبت نشده است.</span>
      </div>
    );
  }

  // duplicate برای marquee پیوسته
  const looped = [...wires, ...wires];

  return (
    <section className={s.root} aria-label="فعالیت لحظه‌ای">
      <div className={s.left}>
        <span className={s.live}>
          <span className={s.liveDot} aria-hidden />
          LIVE
        </span>
        <span className={s.label}>جریان فعالیت</span>
      </div>

      <div className={s.viewport} aria-live="off">
        <div className={s.track} style={{ '--count': looped.length } as CSSProperties}>
          {looped.map((w, i) => (
            <span key={`${w.id}-${i}`} className={s.chip} data-tone={w.tone ?? 'muted'}>
              <span className={s.chipLabel}>{w.label}</span>
              <span className={s.chipValue}>{w.value}</span>
              {w.hint && (
                <span className={s.chipHint}>
                  {w.hint.includes('↑') ? (
                    <ArrowUpRight size={11} aria-hidden />
                  ) : w.hint.includes('↓') ? (
                    <ArrowDownRight size={11} aria-hidden />
                  ) : (
                    <Minus size={11} aria-hidden />
                  )}
                  <span>{w.hint}</span>
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <span className={s.corner} aria-hidden />
    </section>
  );
}

export default LiveWirePanel;
