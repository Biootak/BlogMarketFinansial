'use client';

/**
 * NewCampaignForm v3 — Editorial Broadcast Studio
 * ─────────────────────────────────────────────────────────────────
 *  فلسفه: «استودیوی نویسندگی» — یک ویرایشگر با حس editorial.
 *  ساختار (طبق §3.7 Restraint — ۴ zone، ۳ tone، ۱ overlay، ۲ motion):
 *
 *    1. HERO (cover، dark، page-specific) — BroadcastFormHero با BroadcastWave SVG
 *    2. CONTENT card (title/subject/body + inline preview)
 *    3. CHANNEL × AUDIENCE دو ستون موازی
 *    4. SCHEDULE card با timeline نواری
 *    + Live Preview Pane (sticky, right col) — BroadcastFormPreview
 *    + Sticky Save Bar (bottom) — BroadcastFormSaveBar
 *
 *  Tone ها (۳ tone، ۱ dominant):
 *    - dominant: emerald (oklch 165) — broadcast / sending
 *    - accent:   indigo (oklch 265) — meta / hierarchy
 *    - utility:  amber  (oklch 70)  — schedule / warning
 *
 *  Motion (۲ حداکثر): LiveDot pulse + CountUp fade.
 *  Overlay (۱): ambient gradient در hero cover.
 *  SVG signature (۱): BroadcastWave در hero.
 */

import { FormField } from '@/components/Dashboard/primitives';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { BroadcastFormHero } from './BroadcastFormHero';
import { BroadcastFormPreview } from './BroadcastFormPreview';
import { BroadcastFormSaveBar } from './BroadcastFormSaveBar';
import s from './NewCampaign.module.css';
import {
  AUDIENCES,
  type Audience,
  CHANNELS,
  type Channel,
  type Status,
  toPersianDigits,
} from './broadcast-form-constants';

interface NewCampaignFormProps {
  initialAudience?: string | null;
  entityLabel?: string;
  campaignMode?: boolean;
  editId?: string;
  initialValues?: {
    name: string;
    subject: string | null;
    body: string;
    channels: Channel[];
    audience: Audience;
    audienceFilter: string | null;
    scheduledAt: string | null;
    status: Status;
  };
  backHref?: string;
}

export function NewCampaignForm({
  initialAudience,
  entityLabel = 'اعلان',
  campaignMode = false,
  editId,
  initialValues,
  backHref,
}: NewCampaignFormProps = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ─── state ──────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? '');
  const [body, setBody] = useState(initialValues?.body ?? '');
  const [subject, setSubject] = useState(initialValues?.subject ?? '');
  const [channels, setChannels] = useState<Channel[]>(
    initialValues?.channels && initialValues.channels.length > 0
      ? initialValues.channels
      : campaignMode
        ? ['email']
        : ['inapp'],
  );
  const [audience, setAudience] = useState<Audience>(
    initialValues?.audience ??
      (initialAudience?.startsWith('role:')
        ? 'role'
        : initialAudience === 'segment'
          ? 'segment'
          : 'all'),
  );
  const [audienceFilter, setAudienceFilter] = useState<string>(
    initialValues?.audienceFilter ??
      (initialAudience?.startsWith('role:') ? initialAudience.slice('role:'.length) : ''),
  );
  const [date, setDate] = useState<Date | null>(
    initialValues?.scheduledAt ? new Date(initialValues.scheduledAt) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // validation زنده — خطا همان لحظه که فیلد پر/تغییر می‌شود نمایش داده می‌شود
  const liveErrors = useMemo(() => {
    if (
      !touched.name &&
      !touched.body &&
      !touched.channels &&
      !touched.subject &&
      !touched.audienceFilter
    ) {
      return {} as Record<string, string>;
    }
    const errs: Record<string, string> = {};
    if (touched.name && !name.trim()) errs.name = `عنوان ${entityLabel} الزامی است`;
    if (touched.body && !body.trim()) errs.body = `متن ${entityLabel} الزامی است`;
    if (touched.channels && channels.length === 0) errs.channels = 'حداقل یک کانال انتخاب کنید';
    if (campaignMode && channels[0] === 'email' && touched.subject && !subject.trim()) {
      errs.subject = 'برای کمپین ایمیلی، موضوع الزامی است';
    }
    if (audience === 'role' && touched.audienceFilter && !audienceFilter.trim()) {
      errs.audienceFilter = 'نقش مخاطب (مثلاً ADMIN) را وارد کنید';
    }
    return errs;
  }, [touched, name, body, channels, subject, audience, audienceFilter, campaignMode, entityLabel]);

  const touch = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  // ─── derived ────────────────────────────────────────────
  const toggleChannel = (id: Channel) => {
    if (campaignMode) {
      setChannels([id]);
      touch('channels');
      return;
    }
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    touch('channels');
  };

  const bodyLimit = campaignMode ? 10_000 : 2_000;
  const activeAudience = AUDIENCES.find((a) => a.id === audience)!;
  const selectedChannelInfo = CHANNELS.find((c) => c.id === channels[0]);
  const reachCount = useMemo(() => {
    if (audience === 'role') return Math.max(0, Math.round(activeAudience.count));
    return activeAudience.count;
  }, [audience, activeAudience.count]);
  const channelCount = campaignMode ? 1 : channels.length;

  // ─── submit ─────────────────────────────────────────────
  const submit = (mode: 'draft' | 'publish') => {
    setError(null);
    setOk(null);
    // همهٔ فیلدها را touched کن تا خطاهای زنده نمایش داده شوند
    setTouched({ name: true, body: true, channels: true, subject: true, audienceFilter: true });
    const firstError = liveErrors[Object.keys(liveErrors)[0]];
    if (firstError) {
      setError(firstError);
      return;
    }

    startTransition(async () => {
      try {
        const url = campaignMode
          ? '/api/communication/campaigns'
          : '/api/communication/announcements';
        const payload = campaignMode
          ? {
              name,
              channel: channels[0],
              subject: subject.trim() || null,
              body,
              audience,
              audienceFilter: audienceFilter.trim() || null,
              scheduledAt: date ? date.toISOString() : null,
              status: mode === 'publish' ? 'sending' : 'draft',
            }
          : {
              title: name,
              body,
              channels,
              audience,
              audienceFilter: audienceFilter.trim() || null,
              scheduledAt: date ? date.toISOString() : null,
              status: mode === 'publish' ? 'published' : 'draft',
            };
        const method = editId ? 'PATCH' : 'POST';
        const finalUrl = editId ? `${url}/${editId}` : url;
        const res = await fetch(finalUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setError(data?.error?.message ?? 'خطا در ذخیره‌سازی');
          return;
        }
        setOk(mode === 'publish' ? `${entityLabel} منتشر شد` : `${entityLabel} ذخیره شد`);
        const targetHref = campaignMode
          ? '/dashboard/communication/campaigns'
          : '/dashboard/communication/announcements';
        setTimeout(() => router.push(targetHref), 600);
      } catch {
        setError('خطای شبکه');
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit('draft');
  };

  const channelActive = (id: Channel) =>
    campaignMode ? channels[0] === id : channels.includes(id);

  const finalBackHref =
    backHref ??
    (campaignMode
      ? '/dashboard/communication/campaigns'
      : '/dashboard/communication/announcements');

  return (
    <div dir="rtl" className={s.page}>
      <BroadcastFormHero
        campaignMode={campaignMode}
        editId={editId}
        entityLabel={entityLabel}
        reachCount={reachCount}
        channelCount={channelCount}
        bodyLength={body.length}
      />

      <form className={s.form} onSubmit={onSubmit} noValidate>
        <div className={s.grid}>
          {/* ═══ LEFT COL: form sections ═══════════════════ */}
          <div className={s.colLeft}>
            {/* ── Content ── */}
            <section className={s.card} aria-labelledby="content-heading">
              <header className={s.cardHead}>
                <div>
                  <h2 id="content-heading" className={s.cardTitle}>
                    محتوای پیام
                  </h2>
                  <p className={s.cardSub}>عنوان، موضوع (در صورت نیاز) و متن اصلی.</p>
                </div>
                <span className={s.cardStep}>۰۱</span>
              </header>

              <div className={s.fields}>
                <FormField label={`عنوان ${entityLabel}`} required error={liveErrors.name}>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      touch('name');
                    }}
                    placeholder={
                      campaignMode ? 'مثلاً: خبرنامه هفتگی بازار' : 'مثلاً: به‌روزرسانی نرخ‌های ارزی'
                    }
                    maxLength={120}
                    required
                    aria-invalid={!!liveErrors.name || undefined}
                  />
                </FormField>

                {campaignMode ? (
                  <FormField
                    label="موضوع ایمیل"
                    required={channels[0] === 'email'}
                    error={liveErrors.subject}
                    hint={
                      channels[0] === 'email'
                        ? 'برای کمپین ایمیلی موضوع الزامی است.'
                        : 'فقط برای کمپین‌های ایمیلی استفاده می‌شود.'
                    }
                  >
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        touch('subject');
                      }}
                      placeholder="موضوع ایمیل…"
                      maxLength={150}
                      aria-invalid={!!liveErrors.subject || undefined}
                    />
                  </FormField>
                ) : null}

                <FormField
                  label={`متن ${entityLabel}`}
                  required
                  error={liveErrors.body}
                  hint={`${toPersianDigits(body.length)} از ${toPersianDigits(bodyLimit)} کاراکتر`}
                >
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      touch('body');
                    }}
                    placeholder={campaignMode ? 'متن کامل کمپین…' : 'متن کامل پیام…'}
                    className={s.textarea}
                    rows={7}
                    maxLength={bodyLimit}
                    required
                    aria-invalid={!!liveErrors.body || undefined}
                  />
                </FormField>
              </div>
            </section>

            {/* ── Channels + Audience (2-col) ── */}
            <div className={s.twin}>
              {/* Channels */}
              <section className={s.card} aria-labelledby="channels-heading">
                <header className={s.cardHead}>
                  <div>
                    <h2 id="channels-heading" className={s.cardTitle}>
                      کانال
                    </h2>
                    <p className={s.cardSub}>
                      {campaignMode ? 'یکی انتخاب کنید.' : 'می‌توانید چندتا انتخاب کنید.'}
                    </p>
                  </div>
                  <span className={s.cardStep}>۰۲</span>
                </header>

                <div className={s.channelList} role="radiogroup" aria-label="انتخاب کانال">
                  {CHANNELS.map((c) => {
                    const active = channelActive(c.id);
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={s.channelCard}
                        data-tone={c.tone}
                        data-active={active}
                        onClick={() => toggleChannel(c.id)}
                        role={campaignMode ? 'radio' : 'checkbox'}
                        aria-checked={active}
                        aria-pressed={!campaignMode ? active : undefined}
                      >
                        <span className={s.channelCardGlyph} data-tone={c.tone}>
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className={s.channelCardBody}>
                          <span className={s.channelCardLabel}>{c.label}</span>
                          <span className={s.channelCardHint}>{c.hint}</span>
                        </span>
                        <span className={s.channelCardCheck} aria-hidden>
                          {active ? <CheckIcon /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!campaignMode && channels.length > 0 ? (
                  <p className={s.channelSummary}>
                    <span className={s.channelSummaryKey}>
                      {toPersianDigits(channels.length)} کانال انتخاب شده:
                    </span>
                    <span className={s.channelSummaryVal}>
                      {channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join(' · ')}
                    </span>
                  </p>
                ) : null}
                {campaignMode && selectedChannelInfo ? (
                  <p className={s.channelSummary}>
                    <span className={s.channelSummaryKey}>کانال انتخاب‌شده:</span>
                    <span className={s.channelSummaryVal}>{selectedChannelInfo.hint}</span>
                  </p>
                ) : null}
              </section>

              {/* Audience */}
              <section className={s.card} aria-labelledby="audience-heading">
                <header className={s.cardHead}>
                  <div>
                    <h2 id="audience-heading" className={s.cardTitle}>
                      مخاطب
                    </h2>
                    <p className={s.cardSub}>
                      {campaignMode ? 'گیرندگان این کمپین.' : 'پیام به چه کسی برسد؟'}
                    </p>
                  </div>
                  <span className={s.cardStep}>۰۳</span>
                </header>

                <div className={s.audienceList} role="radiogroup" aria-label="انتخاب مخاطب">
                  {AUDIENCES.map((a) => {
                    const active = audience === a.id;
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={s.audienceCard}
                        data-tone={a.tone}
                        data-active={active}
                        onClick={() => {
                          setAudience(a.id);
                          touch('audience');
                        }}
                        role="radio"
                        aria-checked={active}
                      >
                        <span className={s.audienceCardGlyph} data-tone={a.tone}>
                          <Icon size={16} aria-hidden />
                        </span>
                        <span className={s.audienceCardBody}>
                          <span className={s.audienceCardLabel}>{a.label}</span>
                          <span className={s.audienceCardDesc}>{a.description}</span>
                        </span>
                        <span className={s.audienceCardCount}>
                          {toPersianDigits(a.count.toLocaleString('en-US'))}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {audience === 'role' ? (
                  <FormField label="نقش مخاطب" required className={s.subField}>
                    <Input
                      id="audienceFilter"
                      value={audienceFilter}
                      onChange={(e) => {
                        setAudienceFilter(e.target.value.toUpperCase());
                        touch('audienceFilter');
                      }}
                      placeholder="مثلاً ADMIN یا MERCHANT"
                      maxLength={40}
                    />
                  </FormField>
                ) : null}
                {audience === 'segment' ? (
                  <FormField label="شناسه سگمنت" required className={s.subField}>
                    <Input
                      id="audienceFilter"
                      value={audienceFilter}
                      onChange={(e) => {
                        setAudienceFilter(e.target.value);
                        touch('audienceFilter');
                      }}
                      placeholder="مثلاً segment:vip-customers"
                      maxLength={60}
                    />
                  </FormField>
                ) : null}
              </section>
            </div>

            {/* ── Schedule ── */}
            <section className={s.card} aria-labelledby="schedule-heading">
              <header className={s.cardHead}>
                <div>
                  <h2 id="schedule-heading" className={s.cardTitle}>
                    زمان‌بندی
                  </h2>
                  <p className={s.cardSub}>اگر خالی بگذارید، همان لحظه ذخیره/ارسال می‌شود.</p>
                </div>
                <span className={s.cardStep}>۰۴</span>
              </header>

              <div className={s.scheduleWrap}>
                <FormField
                  label="زمان انتشار"
                  hint={
                    date ? `ارسال در ${date.toLocaleString('fa-IR')}` : 'بدون زمان‌بندی — ارسال فوری'
                  }
                >
                  <PersianDatePicker value={date} onChange={(d) => setDate(d)} />
                </FormField>

                <div className={s.timeline} aria-hidden>
                  <div className={s.timelineBar} />
                  <div
                    className={s.timelineMark}
                    data-tone="emerald"
                    style={{ insetInlineStart: '0%' }}
                  >
                    <span className={s.timelineMarkLabel}>اکنون</span>
                  </div>
                  {date ? (
                    <div
                      className={s.timelineMark}
                      data-tone="indigo"
                      style={{ insetInlineStart: '70%' }}
                    >
                      <span className={s.timelineMarkLabel}>
                        {date.toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={s.timelineMark}
                      data-tone="amber"
                      style={{ insetInlineStart: '100%' }}
                    >
                      <span className={s.timelineMarkLabel}>ارسال فوری</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* inline alert — خطای زندهٔ بخشی (کانال/مخاطب) + خطای submit */}
            {liveErrors.channels || liveErrors.audienceFilter || error ? (
              <div className={s.alert} data-tone="rose" role="alert">
                {error ?? liveErrors.channels ?? liveErrors.audienceFilter}
              </div>
            ) : null}
            {ok ? (
              <div className={s.alert} data-tone="emerald" role="status">
                {ok}
              </div>
            ) : null}
          </div>

          {/* ═══ RIGHT COL: live preview ═══════════════════ */}
          <BroadcastFormPreview
            campaignMode={campaignMode}
            channels={channels}
            name={name}
            body={body}
            subject={subject}
            reachCount={reachCount}
          />
        </div>

        <BroadcastFormSaveBar
          pending={pending}
          campaignMode={campaignMode}
          backHref={finalBackHref}
          onSubmit={submit}
        />
      </form>
    </div>
  );
}

// Internal: tiny inline check icon to avoid extra import
function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden>
      <path
        d="M3 8l3 3 7-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
