'use client';

/**
 * ExchangeDrawer (v2) — "Command Sheet" — Atelier 2026
 *
 * Centered modal-style sheet that replaces the old side drawer.
 * 3 sections with a progress rail at the top, 2-col form on the left,
 * live preview of the resulting exchange card on the right.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  ⌘ COMMAND SHEET         [01/03]   ··· 02 ··· 03        │
 *   │  صرافی جدید / ویرایش ...                                │
 *   ├─────────────────────────────────┬────────────────────────┤
 *   │  ① هویت                        │  ┌──────────────────┐  │
 *   │  [name] [slug-auto]             │  │  Live Preview    │  │
 *   │  [city]   [license]             │  │  (mini tile)     │  │
 *   │  [address]                      │  │                  │  │
 *   │                                 │  │  Reflects form   │  │
 *   │  ② تماس                        │  │  state in real   │  │
 *   │  [phone] [email]                │  │  time            │  │
 *   │                                 │  │                  │  │
 *   │  ③ پلتفرم                      │  │  Status pill     │  │
 *   │  [fee]  [daily-limit]           │  │  updates live    │  │
 *   │  [status-select] [kyc-toggle]   │  └──────────────────┘  │
 *   ├─────────────────────────────────┴────────────────────────┤
 *   │  [انصراف]   ●●●○○ step 1/3         [ذخیره ←]           │
 *   └──────────────────────────────────────────────────────────┘
 */

import type { ExchangeRow } from '@/actions/exchanges';
import { FormField } from '@/components/Dashboard/primitives';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileCheck2,
  Globe2,
  Hash,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './ExchangeDrawer.module.css';
import Monogram from './Monogram';
import StatusPill from './StatusPill';

interface Props {
  open: boolean;
  initialData: ExchangeRow | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);

// ─── sections definitions ──────────────────────────────────────────────
const SECTIONS = [
  { id: 'identity', label: 'هویت', cap: '01', icon: Building2 },
  { id: 'contact', label: 'تماس', cap: '02', icon: Phone },
  { id: 'platform', label: 'پلتفرم', cap: '03', icon: Coins },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const STATUS_TONE = {
  PENDING: { label: 'در انتظار', cls: 'gold' as const },
  ACTIVE: { label: 'فعال', cls: 'emerald' as const },
  SUSPENDED: { label: 'معلق', cls: 'rose' as const },
  CLOSED: { label: 'بسته', cls: 'slate' as const },
} as const;

const _faNum = new Intl.NumberFormat('fa-IR');
const fmt = (n: number) => _faNum.format(n);

export default function ExchangeDrawer({ open, initialData, saving, onClose, onSave }: Props) {
  // ── form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [licenseNo, setLicenseNo] = useState(initialData?.licenseNo ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [platformFee, setPlatformFee] = useState(String(initialData?.platformFee ?? '0'));
  const [dailyLimitAf, setDailyLimitAf] = useState(
    String(initialData?.dailyLimitAf ? Number(initialData.dailyLimitAf) : 0),
  );
  const [status, setStatus] = useState<string>(initialData?.status ?? 'PENDING');
  const [requireKyc, setRequireKyc] = useState(initialData?.requireKyc ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('identity');
  const firstRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── sync when opened ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? '');
      setSlug(initialData?.slug ?? '');
      setLicenseNo(initialData?.licenseNo ?? '');
      setCity(initialData?.city ?? '');
      setAddress(initialData?.address ?? '');
      setPhone(initialData?.phone ?? '');
      setEmail(initialData?.email ?? '');
      setPlatformFee(String(initialData?.platformFee ?? '0'));
      setDailyLimitAf(String(initialData?.dailyLimitAf ? Number(initialData.dailyLimitAf) : 0));
      setStatus(initialData?.status ?? 'PENDING');
      setRequireKyc(initialData?.requireKyc ?? true);
      setErrors({});
      setActiveSection('identity');
      const t = window.setTimeout(() => firstRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, initialData]);

  // ── esc + body lock + focus trap ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        // simple focus trap
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"]), a[href]',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initialData) {
      setSlug(slugify(v));
    }
  };

  // ── progress: count completed fields per section ──────────────────────
  const progress = useMemo(() => {
    const idDone = [name.trim(), slug.trim()].filter(Boolean).length;
    const ctDone = [phone.trim(), /@/.test(email) ? email : ''].filter(Boolean).length;
    const plDone = [platformFee !== '0' ? '1' : '', status, requireKyc ? '1' : ''].filter(
      Boolean,
    ).length;
    return {
      identity: idDone >= 2 ? 100 : (idDone / 2) * 100,
      contact: ctDone >= 2 ? 100 : (ctDone / 2) * 100,
      platform: plDone >= 3 ? 100 : (plDone / 3) * 100,
    };
  }, [name, slug, phone, email, platformFee, status, requireKyc]);

  const totalProgress = useMemo(() => {
    return Math.round((progress.identity + progress.contact + progress.platform) / 3);
  }, [progress]);

  // ── validation ────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'نام الزامی است';
    if (!slug.trim()) errs.slug = 'slug الزامی است';
    if (!/^[a-z0-9-]+$/.test(slug)) {
      errs.slug = 'فقط حروف انگلیسی کوچک، اعداد و خط تیره';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'ایمیل نامعتبر';
    const fee = Number.parseFloat(platformFee);
    if (Number.isNaN(fee) || fee < 0 || fee > 100) {
      errs.platformFee = 'کارمزد باید بین ۰ تا ۱۰۰ باشد';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave({
      name: name.trim(),
      slug: slug.trim(),
      licenseNo: licenseNo.trim() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      platformFee: Number.parseFloat(platformFee) || 0,
      dailyLimitAf: Number.parseInt(dailyLimitAf) || 0,
      status,
      requireKyc,
    });
  };

  // ── go to next section ────────────────────────────────────────────────
  const goNext = () => {
    if (activeSection === 'identity') setActiveSection('contact');
    else if (activeSection === 'contact') setActiveSection('platform');
  };
  const goPrev = () => {
    if (activeSection === 'platform') setActiveSection('contact');
    else if (activeSection === 'contact') setActiveSection('identity');
  };

  if (!open || !mounted) return null;

  // preview card data
  const previewName = name.trim() || 'نام صرافی';
  const previewSlug = slug.trim() || 'exchange-slug';
  const previewCity = city.trim() || '—';
  const previewFee = platformFee !== '0' ? `${platformFee}٪` : '—';
  const previewStatus = status as keyof typeof STATUS_TONE;
  const statusMeta = STATUS_TONE[previewStatus] ?? STATUS_TONE.PENDING;

  return createPortal(
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={initialData ? `ویرایش ${initialData.name}` : 'صرافی جدید'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={s.sheet} ref={panelRef} dir="rtl">
        {/* ─── Header — progress rail ─────────────────────────────── */}
        <header className={s.header}>
          <div className={s.headerTop}>
            <div className={s.headerBrand}>
              <span className={s.headerMark} aria-hidden>
                <Sparkles size={13} strokeWidth={2.25} aria-hidden />
              </span>
              <div className={s.headerText}>
                <span className={s.eyebrow}>
                  <span className={s.eyebrowDot} aria-hidden />
                  COMMAND SHEET · ۲۰۲۶
                </span>
                <h2 className={s.title}>
                  {initialData ? `ویرایش — ${initialData.name}` : 'صرافی جدید'}
                </h2>
              </div>
            </div>
            <div className={s.headerMeta}>
              <span className={s.metaPill}>
                <span className={s.metaPillKey}>پیشرفت</span>
                <span className={s.metaPillVal} dir="ltr">
                  {totalProgress}٪
                </span>
              </span>
              <button type="button" className={s.closeBtn} onClick={onClose} aria-label="بستن">
                <X size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>

          {/* ریل بخش‌ها */}
          <nav className={s.sectionRail} aria-label="بخش‌های فرم">
            {SECTIONS.map((sec, _i) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              const pct = progress[sec.id];
              return (
                <button
                  key={sec.id}
                  type="button"
                  className={`${s.sectionNode} ${isActive ? s.sectionNodeActive : ''}`}
                  onClick={() => setActiveSection(sec.id)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`بخش ${sec.cap}: ${sec.label}`}
                >
                  <span className={s.sectionNodeIdx} aria-hidden>
                    {sec.cap}
                  </span>
                  <span className={s.sectionNodeIco} aria-hidden>
                    <Icon size={11} strokeWidth={2} aria-hidden />
                  </span>
                  <span className={s.sectionNodeLabel}>{sec.label}</span>
                  <span className={s.sectionNodeBar} aria-hidden>
                    <span
                      className={s.sectionNodeBarFill}
                      style={{ ['--pct' as string]: `${pct}%` } as React.CSSProperties}
                    />
                  </span>
                </button>
              );
            })}
            <span className={s.sectionRailLine} aria-hidden />
          </nav>
        </header>

        {/* ─── Body — 2-column: form + preview ────────────────────── */}
        <div className={s.body}>
          {/* ── form column ────────────────────────────────────── */}
          <div className={s.form}>
            {activeSection === 'identity' && (
              <section className={s.section} key="identity">
                <h3 className={s.sectionTitle}>
                  <span className={s.sectionCap} aria-hidden>
                    ۰۱
                  </span>
                  <span>هویت صرافی</span>
                  <span className={s.sectionLine} aria-hidden />
                </h3>

                <FormField label="نام صرافی" required error={errors.name}>
                  <div className={s.inputWrap}>
                    <Building2 className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                    <input
                      ref={firstRef}
                      className={`${s.input} ${s.inputIcoPad} ${errors.name ? s.inputError : ''}`}
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="مثال: صرافی نوری هرات"
                      aria-invalid={!!errors.name}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Slug"
                  required
                  error={errors.slug}
                  hint={
                    initialData
                      ? 'برای تغییر، نام صرافی را ویرایش کنید'
                      : 'به‌صورت خودکار از نام ساخته می‌شود'
                  }
                >
                  <div className={s.inputWrap}>
                    <Hash className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                    <input
                      className={`${s.input} ${s.inputIcoPad} ${s.inputLtr} ${errors.slug ? s.inputError : ''}`}
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      placeholder="exchange-slug"
                      disabled={!!initialData}
                      aria-invalid={!!errors.slug}
                    />
                    {slug && /^[a-z0-9-]+$/.test(slug) && (
                      <span className={s.inputCheck} aria-hidden>
                        <Check size={11} strokeWidth={2.5} aria-hidden />
                      </span>
                    )}
                  </div>
                </FormField>

                <div className={s.grid2}>
                  <FormField label="شهر">
                    <div className={s.inputWrap}>
                      <MapPin className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                      <input
                        className={`${s.input} ${s.inputIcoPad}`}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="هرات"
                      />
                    </div>
                  </FormField>
                  <FormField label="شماره مجوز">
                    <div className={s.inputWrap}>
                      <FileCheck2 className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                      <input
                        className={`${s.input} ${s.inputIcoPad} ${s.inputLtr}`}
                        value={licenseNo}
                        onChange={(e) => setLicenseNo(e.target.value)}
                        placeholder="AF-2026-XXX"
                      />
                    </div>
                  </FormField>
                </div>

                <FormField label="آدرس">
                  <div className={s.inputWrap}>
                    <Globe2 className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                    <input
                      className={`${s.input} ${s.inputIcoPad}`}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="آدرس کامل"
                    />
                  </div>
                </FormField>
              </section>
            )}

            {activeSection === 'contact' && (
              <section className={s.section} key="contact">
                <h3 className={s.sectionTitle}>
                  <span className={s.sectionCap} aria-hidden>
                    ۰۲
                  </span>
                  <span>اطلاعات تماس</span>
                  <span className={s.sectionLine} aria-hidden />
                </h3>

                <div className={s.grid2}>
                  <FormField label="تلفن">
                    <div className={s.inputWrap}>
                      <Phone className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                      <input
                        className={`${s.input} ${s.inputIcoPad} ${s.inputLtr}`}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+93..."
                        type="tel"
                      />
                    </div>
                  </FormField>
                  <FormField label="ایمیل" error={errors.email}>
                    <div className={s.inputWrap}>
                      <Mail className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                      <input
                        className={`${s.input} ${s.inputIcoPad} ${s.inputLtr} ${errors.email ? s.inputError : ''}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="info@exchange.af"
                        type="email"
                        aria-invalid={!!errors.email}
                      />
                    </div>
                  </FormField>
                </div>

                <div className={s.callout}>
                  <span className={s.calloutIco} aria-hidden>
                    <ShieldCheck size={14} strokeWidth={2} aria-hidden />
                  </span>
                  <div className={s.calloutText}>
                    <strong>حریم خصوصی:</strong>
                    <span>
                      {' '}
                      این اطلاعات فقط برای احراز هویت استفاده می‌شود و در پروفایل عمومی نمایش داده
                      نمی‌شود.
                    </span>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'platform' && (
              <section className={s.section} key="platform">
                <h3 className={s.sectionTitle}>
                  <span className={s.sectionCap} aria-hidden>
                    ۰۳
                  </span>
                  <span>تنظیمات پلتفرم</span>
                  <span className={s.sectionLine} aria-hidden />
                </h3>

                <div className={s.grid2}>
                  <FormField label="کارمزد (٪)" error={errors.platformFee} hint="درصد از هر تراکنش">
                    <div className={s.inputWrap}>
                      <Coins className={s.inputIco} size={14} strokeWidth={1.75} aria-hidden />
                      <input
                        className={`${s.input} ${s.inputIcoPad} ${s.inputLtr} ${errors.platformFee ? s.inputError : ''}`}
                        value={platformFee}
                        onChange={(e) => setPlatformFee(e.target.value)}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        aria-invalid={!!errors.platformFee}
                      />
                      <span className={s.inputSuffix} aria-hidden>
                        ٪
                      </span>
                    </div>
                  </FormField>
                  <FormField label="سقف روزانه (افغانی)" hint="۰ = بدون محدودیت">
                    <div className={s.inputWrap}>
                      <input
                        className={`${s.input} ${s.inputIcoPad} ${s.inputLtr}`}
                        value={dailyLimitAf}
                        onChange={(e) => setDailyLimitAf(e.target.value)}
                        type="number"
                        min="0"
                        style={{ paddingInlineStart: 12 }}
                      />
                      <span className={s.inputSuffix} aria-hidden>
                        AFN
                      </span>
                    </div>
                  </FormField>
                </div>

                <FormField label="وضعیت">
                  <div className={s.statusPicker} role="radiogroup" aria-label="وضعیت صرافی">
                    {(['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'] as const).map((st) => {
                      const meta = STATUS_TONE[st];
                      const active = status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={`${s.statusChip} ${active ? s.statusChipActive : ''} ${s[`statusChip_${st}`] ?? ''}`}
                          onClick={() => setStatus(st)}
                        >
                          <span className={s.statusChipDot} aria-hidden />
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </FormField>

                <FormField label="الزام KYC" hint="تأیید هویت اجباری باشد؟">
                  <label
                    className={s.toggle}
                    htmlFor="exchange-require-kyc"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      setRequireKyc((v) => !v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRequireKyc((v) => !v);
                      }
                    }}
                  >
                    <Switch
                      id="exchange-require-kyc"
                      checked={requireKyc}
                      onCheckedChange={(c) => setRequireKyc(c === true)}
                      aria-label="الزام KYC"
                    />
                    <span className={s.toggleText}>
                      {requireKyc ? 'بله — اجباری' : 'خیر — اختیاری'}
                    </span>
                  </label>
                </FormField>
              </section>
            )}

            {/* دکمه‌های prev/next در پایین فرم */}
            <div className={s.formNav}>
              <button
                type="button"
                className={s.navBtn}
                onClick={goPrev}
                disabled={activeSection === 'identity'}
              >
                <ChevronRight size={13} strokeWidth={2.25} aria-hidden />
                <span>قبلی</span>
              </button>
              <span className={s.formNavMeta}>
                بخش {SECTIONS.findIndex((s) => s.id === activeSection) + 1} از {SECTIONS.length}
              </span>
              {activeSection !== 'platform' ? (
                <button type="button" className={`${s.navBtn} ${s.navBtnAccent}`} onClick={goNext}>
                  <span>بعدی</span>
                  <ChevronLeft size={13} strokeWidth={2.25} aria-hidden />
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>

          {/* ── preview column ────────────────────────────────── */}
          <aside className={s.preview} aria-label="پیش‌نمایش زنده">
            <div className={s.previewHead}>
              <span className={s.previewCap}>PREVIEW · LIVE</span>
              <span className={s.previewMeta} dir="ltr">
                n={fmt(Math.max(1, previewName.length))}
              </span>
            </div>

            <div className={s.previewCard}>
              <div className={s.previewCardHead}>
                <Monogram
                  name={previewName}
                  size="lg"
                  shape="square"
                  tone={
                    statusMeta.cls === 'emerald'
                      ? 'emerald'
                      : statusMeta.cls === 'gold'
                        ? 'gold'
                        : statusMeta.cls === 'rose'
                          ? 'rose'
                          : 'slate'
                  }
                />
                <div className={s.previewCardInfo}>
                  <span className={s.previewName}>{previewName}</span>
                  <span className={s.previewSlug}>/{previewSlug}</span>
                </div>
                <StatusPill status={previewStatus} />
              </div>

              <div className={s.previewStats}>
                <div className={s.previewStat}>
                  <span className={s.previewStatCap}>مشتری</span>
                  <span className={s.previewStatVal}>۰</span>
                </div>
                <div className={s.previewStat}>
                  <span className={s.previewStatCap}>کارمزد</span>
                  <span className={s.previewStatVal} dir="ltr">
                    {previewFee}
                  </span>
                </div>
                <div className={s.previewStat}>
                  <span className={s.previewStatCap}>شهر</span>
                  <span className={s.previewStatVal} style={{ fontSize: 12 }}>
                    {previewCity}
                  </span>
                </div>
                <div className={s.previewStat}>
                  <span className={s.previewStatCap}>KYC</span>
                  <span className={s.previewStatVal} style={{ fontSize: 12 }}>
                    {requireKyc ? 'الزامی' : 'اختیاری'}
                  </span>
                </div>
              </div>

              <div className={s.previewFoot}>
                <span className={s.previewFootDot} aria-hidden />
                <span>پس از ذخیره، این کارت در موزائیک ظاهر می‌شود</span>
              </div>
            </div>

            {/* خلاصهٔ فیلدها */}
            <div className={s.previewSummary}>
              {[
                { k: 'نام', v: name || '—' },
                { k: 'Slug', v: slug || '—' },
                { k: 'شهر', v: city || '—' },
                { k: 'مجوز', v: licenseNo || '—' },
                { k: 'تلفن', v: phone || '—' },
                { k: 'ایمیل', v: email || '—' },
                { k: 'کارمزد', v: platformFee !== '0' ? `${platformFee}٪` : '—' },
                { k: 'سقف', v: dailyLimitAf !== '0' ? `${fmt(Number(dailyLimitAf))} AFN` : '∞' },
              ].map((row) => (
                <div key={row.k} className={s.previewRow}>
                  <span className={s.previewRowK}>{row.k}</span>
                  <span
                    className={`${s.previewRowV} ${!row.v || row.v === '—' ? s.previewRowVEmpty : ''}`}
                    dir={/^[a-z0-9-]+$/i.test(String(row.v)) ? 'ltr' : undefined}
                  >
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <footer className={s.footer}>
          <div className={s.footerLeft}>
            <button type="button" className={s.btnGhost} onClick={onClose}>
              انصراف
            </button>
          </div>
          <div className={s.footerMid}>
            <span className={s.progressBar} aria-hidden>
              <span
                className={s.progressBarFill}
                style={{ ['--pct' as string]: `${totalProgress}%` } as React.CSSProperties}
              />
            </span>
            <span className={s.progressLabel} dir="ltr">
              {totalProgress}٪
            </span>
          </div>
          <div className={s.footerRight}>
            <button
              type="button"
              className={s.btnPrimary}
              onClick={handleSubmit}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? (
                <>
                  <span className={s.spinner} aria-hidden />
                  در حال ذخیره…
                </>
              ) : (
                <>
                  <span>{initialData ? 'ذخیره تغییرات' : 'ایجاد صرافی'}</span>
                  <ArrowLeft size={13} strokeWidth={2.25} aria-hidden />
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
