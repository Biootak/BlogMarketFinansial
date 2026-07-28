'use client';

/**
 * WorkingHoursWorkspace — ویرایش ساعات کاری هفتگی.
 *
 *   از HoursMatrix primitive برای UI استفاده می‌کند.
 *   مقدار در address صرافی به صورت ;HOURS=JSON ذخیره می‌شود.
 */

import {
  type HoursValue,
  HoursMatrix,
  SettingsSurfaceCard,
  StickySaveBar,
} from '@/components/Dashboard/primitives';
import { type ExchangeRow, updateExchangeSelf } from '@/actions/exchanges';
import { Clock, Info, MapPin, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import s from './WorkingHoursWorkspace.module.css';

type HoursMap = {
  sat: HoursValue;
  sun: HoursValue;
  mon: HoursValue;
  tue: HoursValue;
  wed: HoursValue;
  thu: HoursValue;
  fri: HoursValue;
};

const DAYS: ReadonlyArray<{ key: keyof HoursMap; label: string }> = [
  { key: 'sat', label: 'شنبه' },
  { key: 'sun', label: 'یکشنبه' },
  { key: 'mon', label: 'دوشنبه' },
  { key: 'tue', label: 'سه‌شنبه' },
  { key: 'wed', label: 'چهارشنبه' },
  { key: 'thu', label: 'پنجشنبه' },
  { key: 'fri', label: 'جمعه' },
];

const DEFAULT_HOURS: HoursMap = {
  sat: { open: '08:00', close: '16:00', closed: false },
  sun: { open: '08:00', close: '16:00', closed: false },
  mon: { open: '08:00', close: '16:00', closed: false },
  tue: { open: '08:00', close: '16:00', closed: false },
  wed: { open: '08:00', close: '16:00', closed: false },
  thu: { open: '08:00', close: '16:00', closed: false },
  fri: { open: '00:00', close: '00:00', closed: true },
};

function parseHours(address: string | null): HoursMap {
  if (!address) return DEFAULT_HOURS;
  const marker = ';HOURS=';
  const idx = address.indexOf(marker);
  if (idx === -1) return DEFAULT_HOURS;
  const raw = address.slice(idx + marker.length);
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof HoursMap, Partial<HoursValue>>>;
    const merged = { ...DEFAULT_HOURS };
    for (const k of DAYS) {
      const v = parsed[k.key];
      if (v && typeof v === 'object') merged[k.key] = { ...merged[k.key], ...v };
    }
    return merged;
  } catch {
    return DEFAULT_HOURS;
  }
}

function packHours(visibleAddress: string, hours: HoursMap): string {
  const base = visibleAddress.trim();
  return `${base};HOURS=${JSON.stringify(hours)}`;
}

function visibleAddress(address: string | null): string {
  if (!address) return '';
  const idx = address.indexOf(';HOURS=');
  return idx === -1 ? address : address.slice(0, idx);
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type Props = { exchange: ExchangeRow; canEdit: boolean };

export default function WorkingHoursWorkspace({ exchange, canEdit }: Props) {
  const router = useRouter();

  const [hours, setHours] = useState<HoursMap>(() => parseHours(exchange.address));
  const [address, setAddress] = useState(visibleAddress(exchange.address));

  const initial = useRef({
    hours: parseHours(exchange.address),
    address: visibleAddress(exchange.address),
  });

  const dirtyCount = useMemo(() => {
    let n = 0;
    if (JSON.stringify(hours) !== JSON.stringify(initial.current.hours)) n++;
    if (address.trim() !== initial.current.address.trim()) n++;
    return n;
  }, [hours, address]);

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = () => {
    if (!canEdit) return;
    setErrorMessage(null);
    setStatus('saving');
    void (async () => {
      const res = await updateExchangeSelf(exchange.id, {
        address: packHours(address, hours),
      });

      if (res.success) {
        initial.current = { hours, address };
        setStatus('saved');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMessage(res.error.message);
      }
    })();
  };

  const reset = () => {
    setHours(initial.current.hours);
    setAddress(initial.current.address);
    setStatus('idle');
    setErrorMessage(null);
  };

  if (status === 'idle' && dirtyCount > 0 && canEdit) {
    setStatus('dirty');
  }

  return (
    <>
      <div className={s.root}>
        {/* ── Hours matrix ─────────────────────────────────────────── */}
        <SettingsSurfaceCard
          id="hours-matrix"
          title="برنامهٔ هفتگی"
          description="ساعات فعالیت صرافی در هر روز هفته"
          icon={Clock}
          tone="gold"
        >
          <HoursMatrix
            value={hours}
            onChange={(key, val) => setHours((p) => ({ ...p, [key]: val }))}
            disabled={!canEdit}
          />

          {/* ── Quick preset actions ────────────────────────────── */}
          {canEdit && (
            <div className={s.presets}>
              <span className={s.presetsLabel}>
                <Zap size={11} aria-hidden />
                الگوهای آماده:
              </span>
              <button
                type="button"
                className={s.presetBtn}
                onClick={() => {
                  const w: HoursMap = { ...DEFAULT_HOURS };
                  w.fri = { open: '00:00', close: '00:00', closed: true };
                  setHours(w);
                }}
              >
                شنبه تا چهارشنبه
              </button>
              <button
                type="button"
                className={s.presetBtn}
                onClick={() => {
                  const w: HoursMap = { ...DEFAULT_HOURS };
                  w.fri = { open: '00:00', close: '00:00', closed: true };
                  setHours(w);
                }}
              >
                شش‌روز کامل
              </button>
              <button
                type="button"
                className={s.presetBtn}
                onClick={() => {
                  const allClosed: HoursMap = {
                    sat: { open: '00:00', close: '00:00', closed: true },
                    sun: { open: '00:00', close: '00:00', closed: true },
                    mon: { open: '00:00', close: '00:00', closed: true },
                    tue: { open: '00:00', close: '00:00', closed: true },
                    wed: { open: '00:00', close: '00:00', closed: true },
                    thu: { open: '00:00', close: '00:00', closed: true },
                    fri: { open: '00:00', close: '00:00', closed: true },
                  };
                  setHours(allClosed);
                }}
              >
                تعطیل کامل
              </button>
              <button
                type="button"
                className={s.presetBtn}
                onClick={() => setHours(DEFAULT_HOURS)}
              >
                بازنشانی
              </button>
            </div>
          )}
        </SettingsSurfaceCard>

        {/* ── Address — با textarea (اختیاری) ─────────────────────── */}
        <SettingsSurfaceCard
          id="hours-address"
          title="آدرس فیزیکی"
          description="آدرس دفتر صرافی که در صفحه عمومی نمایش داده می‌شود"
          icon={MapPin}
          tone="info"
          badge={canEdit ? { label: 'اختیاری', tone: 'neutral' } : undefined}
        >
          <textarea
            className={s.textarea}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!canEdit}
            rows={3}
            maxLength={300}
            placeholder="خیابان، منطقه، شهر…"
            aria-label="آدرس فیزیکی"
          />
        </SettingsSurfaceCard>

        {/* ── Info banner ─────────────────────────────────────────── */}
        <div className={s.infoBanner}>
          <Info size={14} aria-hidden />
          <div>
            <strong>نکته:</strong> ساعات کاری در صفحهٔ عمومی صرافی و در
            اعلان‌های خودکار نمایش داده می‌شود. مشتریان می‌توانند در این ساعات
            از خدمات شما استفاده کنند.
          </div>
        </div>
      </div>

      {canEdit && (
        <StickySaveBar
          status={status}
          dirtyCount={dirtyCount}
          errorMessage={errorMessage}
          onSave={handleSave}
          onDiscard={reset}
        />
      )}
    </>
  );
}
