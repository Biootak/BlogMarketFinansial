'use client';

/**
 * ServicesWorkspace — ویرایشگر سرویس‌های آنلاین صرافی.
 *
 *  الگو:
 *   - ۱۰ سرویس canonical به صورت grid از toggle card
 *   - کارت فعال: input برای توضیح اختصاصی + لینک CTA + عدد ترتیب
 *   - sticky save bar (auto-appear when dirty)
 *   - Save → ۴ حالت: idle / dirty / saving / saved / error
 *   - ۲ state بصری: فعال (سبز) / غیرفعال (خاکستری)
 *
 *  UX patterns:
 *   - `useDirection('rtl')` if needed (but we're in dashboard with its own dir)
 *   - Optimistic toggle با debounce
 *   - `StickySaveBar` مثل ProfileWorkspace
 */

import { updateMyExchangeServices } from '@/actions/exchange-services';
import { SettingsSurfaceCard, StickySaveBar } from '@/components/Dashboard/primitives';
import type { ExchangeServiceMeta } from '@/lib/exchange-services';
import {
  ArrowDown,
  ArrowUp,
  Clock4,
  ExternalLink,
  GripVertical,
  Info,
  Sparkles,
  Type,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import ServicesOnboarding from './ServicesOnboarding';
import s from './ServicesWorkspace.module.css';

type ItemState = {
  id: string;
  serviceKey: string;
  isActive: boolean;
  description: string | null;
  ctaHref: string | null;
  order: number;
  leadTimeMin: number | null;
  meta: ExchangeServiceMeta;
};

type Props = {
  initialItems: ItemState[];
  canEdit: boolean;
};

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export default function ServicesWorkspace({ initialItems, canEdit }: Props) {
  // ── state ───────────────────────────────────────────
  const [items, setItems] = useState<ItemState[]>(initialItems);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial values برای dirty tracking
  const initialRef = useRef(
    JSON.stringify(
      initialItems.map((i) => ({
        serviceKey: i.serviceKey,
        isActive: i.isActive,
        description: i.description,
        ctaHref: i.ctaHref,
        order: i.order,
        leadTimeMin: i.leadTimeMin,
      })),
    ),
  );

  // ── handlers ────────────────────────────────────────
  const updateItem = (serviceKey: string, patch: Partial<ItemState>) => {
    setItems((prev) => prev.map((i) => (i.serviceKey === serviceKey ? { ...i, ...patch } : i)));
  };

  const moveItem = (serviceKey: string, direction: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.serviceKey === serviceKey);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[newIdx];
      next[newIdx] = temp;
      // re-assign order based on new positions
      return next.map((it, i) => ({ ...it, order: (i + 1) * 10 }));
    });
  };

  const reset = () => {
    setItems(initialItems);
    setStatus('idle');
    setErrorMessage(null);
  };

  // ── dirty detection ─────────────────────────────────
  const isDirty = useMemo(() => {
    const current = JSON.stringify(
      items.map((i) => ({
        serviceKey: i.serviceKey,
        isActive: i.isActive,
        description: i.description,
        ctaHref: i.ctaHref,
        order: i.order,
        leadTimeMin: i.leadTimeMin,
      })),
    );
    return current !== initialRef.current;
  }, [items]);

  if (status === 'idle' && isDirty && canEdit) {
    // Mark dirty asynchronously
    queueMicrotask(() => setStatus('dirty'));
  }

  // ── save ────────────────────────────────────────────
  const handleSave = async () => {
    if (!canEdit) return;
    setErrorMessage(null);

    // basic validation
    for (const it of items) {
      if (it.isActive) {
        if (it.description && it.description.length > 400) {
          setStatus('error');
          setErrorMessage(`توضیح "${it.meta.name}" نباید بیش از ۴۰۰ کاراکتر باشد`);
          return;
        }
        if (it.ctaHref && !/^(https?:\/\/|\/)/.test(it.ctaHref)) {
          setStatus('error');
          setErrorMessage(
            `لینک CTA برای "${it.meta.name}" باید با http/https شروع شود یا مسیر داخلی باشد`,
          );
          return;
        }
      }
    }

    setStatus('saving');
    const res = await updateMyExchangeServices({
      services: items.map((it) => ({
        serviceKey: it.serviceKey,
        isActive: it.isActive,
        description: it.description,
        ctaHref: it.ctaHref,
        order: it.order,
        leadTimeMin: it.leadTimeMin,
      })),
    });

    if (res.success) {
      // update initialRef to current state
      initialRef.current = JSON.stringify(
        items.map((i) => ({
          serviceKey: i.serviceKey,
          isActive: i.isActive,
          description: i.description,
          ctaHref: i.ctaHref,
          order: i.order,
          leadTimeMin: i.leadTimeMin,
        })),
      );
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } else {
      setStatus('error');
      setErrorMessage(res.error.message);
    }
  };

  // ── counters ────────────────────────────────────────
  const activeCount = items.filter((i) => i.isActive).length;

  return (
    <>
      <SettingsSurfaceCard
        id="services-intro"
        title="انتخاب سرویس‌ها"
        description={`از بین ${items.length.toLocaleString('fa-IR')} سرویس موجود، ${activeCount.toLocaleString('fa-IR')} سرویس فعال است. سرویس‌های فعال در صفحه عمومی شما و صفحه خدمات نمایش داده می‌شود.`}
        icon={Sparkles}
        tone="accent"
        headerActions={
          <span className={s.activePill}>
            <span className={s.activeDot} aria-hidden />
            {activeCount.toLocaleString('fa-IR')} فعال
          </span>
        }
      >
        <div className={s.notice}>
          <Info size={14} strokeWidth={1.8} aria-hidden />
          <span>
            توضیح و لینک CTA اختیاری هستند. اگر خالی باشند، از مقدار پیش‌فرض catalog استفاده می‌شود.
            ترتیب نمایش در صفحه عمومی صرافی شما و در صفحه خدمات قابل تنظیم است.
          </span>
        </div>
      </SettingsSurfaceCard>

      <ul className={s.list}>
        {items.map((item, idx) => (
          <li
            key={item.serviceKey}
            className={`${s.item} ${item.isActive ? s.itemActive : s.itemInactive}`}
          >
            <header className={s.itemHeader}>
              <div className={s.itemOrderControls}>
                <button
                  type="button"
                  className={s.orderBtn}
                  onClick={() => moveItem(item.serviceKey, -1)}
                  disabled={idx === 0 || !canEdit}
                  aria-label="انتقال به بالا"
                >
                  <ArrowUp size={12} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className={s.orderBtn}
                  onClick={() => moveItem(item.serviceKey, 1)}
                  disabled={idx === items.length - 1 || !canEdit}
                  aria-label="انتقال به پایین"
                >
                  <ArrowDown size={12} strokeWidth={2} />
                </button>
                <span className={s.grip} aria-hidden>
                  <GripVertical size={14} />
                </span>
                <span className={s.orderLabel}>{Math.floor(item.order / 10)}</span>
              </div>

              <div className={`${s.itemIcon} ${s[`accent_${item.meta.accent}`] ?? ''}`} aria-hidden>
                <item.meta.icon size={20} strokeWidth={1.8} />
              </div>

              <div className={s.itemInfo}>
                <h3 className={s.itemTitle}>{item.meta.name}</h3>
                <p className={s.itemDescription}>{item.meta.description}</p>
              </div>

              <label className={s.toggle}>
                <input
                  type="checkbox"
                  checked={item.isActive}
                  onChange={(e) => updateItem(item.serviceKey, { isActive: e.target.checked })}
                  disabled={!canEdit}
                />
                <span className={s.toggleSlider} aria-hidden />
                <span className={s.toggleLabel}>{item.isActive ? 'فعال' : 'غیرفعال'}</span>
              </label>
            </header>

            {item.isActive && (
              <div className={s.itemBody}>
                <div className={s.field}>
                  <label htmlFor={`desc-${item.serviceKey}`} className={s.fieldLabel}>
                    <Type size={12} strokeWidth={1.8} aria-hidden />
                    <span>توضیح اختصاصی</span>
                    <span className={s.fieldOptional}>اختیاری</span>
                  </label>
                  <textarea
                    id={`desc-${item.serviceKey}`}
                    className={s.textarea}
                    value={item.description ?? ''}
                    onChange={(e) =>
                      updateItem(item.serviceKey, {
                        description: e.target.value || null,
                      })
                    }
                    placeholder={item.meta.description}
                    maxLength={400}
                    rows={2}
                    disabled={!canEdit}
                  />
                  <span className={s.counter}>{(item.description ?? '').length}/400</span>
                </div>

                <div className={s.field}>
                  <label htmlFor={`cta-${item.serviceKey}`} className={s.fieldLabel}>
                    <ExternalLink size={12} strokeWidth={1.8} aria-hidden />
                    <span>لینک CTA اختصاصی</span>
                    <span className={s.fieldOptional}>اختیاری</span>
                  </label>
                  <input
                    id={`cta-${item.serviceKey}`}
                    type="text"
                    className={s.input}
                    value={item.ctaHref ?? ''}
                    onChange={(e) =>
                      updateItem(item.serviceKey, { ctaHref: e.target.value || null })
                    }
                    placeholder="https://yoursite.com/buy-usd یا /dashboard/buy"
                    dir="ltr"
                    maxLength={300}
                    disabled={!canEdit}
                  />
                  <span className={s.hint}>
                    اگر لینک خارجی بدهید، مشتری به سایت شما هدایت می‌شود؛ در غیر این صورت مودال
                    درخواست در سایت باز می‌شود.
                  </span>
                </div>

                <div className={s.field}>
                  <label htmlFor={`lead-${item.serviceKey}`} className={s.fieldLabel}>
                    <Clock4 size={12} strokeWidth={1.8} aria-hidden />
                    <span>زمان تقریبی پاسخ‌گویی (SLA)</span>
                    <span className={s.fieldOptional}>اختیاری</span>
                  </label>
                  <div className={s.leadRow}>
                    <input
                      id={`lead-${item.serviceKey}`}
                      type="number"
                      className={s.input}
                      value={item.leadTimeMin ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === '') {
                          updateItem(item.serviceKey, { leadTimeMin: null });
                          return;
                        }
                        const num = Number.parseInt(raw, 10);
                        if (!Number.isNaN(num) && num >= 0 && num <= 10080) {
                          updateItem(item.serviceKey, { leadTimeMin: num });
                        }
                      }}
                      placeholder="مثلاً ۶۰"
                      min={0}
                      max={10080}
                      dir="ltr"
                      disabled={!canEdit}
                    />
                    <select
                      className={s.select}
                      value={deriveLeadUnit(item.leadTimeMin)}
                      onChange={(e) => {
                        const unit = e.target.value as 'min' | 'hour' | 'day';
                        const current = item.leadTimeMin ?? 0;
                        const next =
                          unit === 'min'
                            ? current
                            : unit === 'hour'
                              ? Math.max(1, Math.round(current / 60))
                              : Math.max(1, Math.round(current / (60 * 24)));
                        updateItem(item.serviceKey, { leadTimeMin: next });
                      }}
                      disabled={!canEdit}
                      aria-label="واحد زمان"
                    >
                      <option value="min">دقیقه</option>
                      <option value="hour">ساعت</option>
                      <option value="day">روز</option>
                    </select>
                  </div>
                  <span className={s.hint}>
                    به مشتری نشان داده می‌شود: «پاسخ‌گویی: X ساعت». خالی بگذارید اگر نمی‌توانید تخمین
                    بزنید.
                  </span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <StickySaveBar
          status={status}
          errorMessage={errorMessage}
          onSave={handleSave}
          onDiscard={reset}
          dirtyCount={isDirty ? 1 : 0}
          saveLabel="ذخیره تغییرات"
        />
      )}

      <ServicesOnboarding hasAnyService={activeCount > 0} />
    </>
  );
}

/** 2026-07-28: تعیین واحد زمان بر اساس مقدار فعلی — برای select در UI. */
function deriveLeadUnit(min: number | null): 'min' | 'hour' | 'day' {
  if (min == null || min < 60) return 'min';
  if (min < 60 * 24) return 'hour';
  return 'day';
}
