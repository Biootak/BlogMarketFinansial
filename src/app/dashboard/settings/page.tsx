'use client';

import {
  generateApiKey,
  getSystemSettings,
  testSmtpConnection,
  updateCacheSettings,
  updateEmailSettings,
  updateGeneralSettings,
  updateMaintenanceMode,
} from '@/actions/settingsActions';
import SocialLinksManager from '@/components/Dashboard/Settings/SocialLinksManager';
import { PageHeader } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ImageIcon,
  Loader2,
  type LucideIcon,
  Mail,
  PowerOff,
  RefreshCw,
  Settings,
  Share2,
  Shield,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import s from './settings.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TabType {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
}

interface TabGroup {
  id: string;
  label: string;
  tabs: TabType[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    id: 'system',
    label: 'سیستم',
    tabs: [
      { id: 'general', name: 'تنظیمات عمومی', desc: 'هویت سایت', icon: Settings },
      { id: 'email', name: 'ایمیل / SMTP', desc: 'پیکربندی ارسال', icon: Mail },
      { id: 'maintenance', name: 'حالت تعمیرات', desc: 'کنترل دسترسی سایت', icon: Shield },
      { id: 'advanced', name: 'پیشرفته', desc: 'cache و API', icon: Wrench },
    ],
  },
  {
    id: 'content',
    label: 'محتوا',
    tabs: [
      { id: 'social', name: 'شبکه‌های اجتماعی', desc: 'لینک‌های خارجی', icon: Share2 },
    ],
  },
];

const TABS: TabType[] = TAB_GROUPS.flatMap((g) => g.tabs);

interface FormData {
  general: {
    siteTitle: string;
    siteDescription: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    logoUrl: string;
  };
  email: { smtpServer: string; smtpPort: string; smtpUsername: string; smtpPassword: string };
  maintenance: { maintenanceMode: boolean; maintenanceMessage: string };
  social: { instagram: string; telegram: string; whatsapp: string; twitter: string };
  advanced: {
    debugMode: boolean;
    cacheEnabled: boolean;
    apiRateLimit: boolean;
    cacheDuration: number;
    maxUploadSize: number;
    errorLevel: string;
    logPath: string;
    apiKey: string;
    cacheStorage: string;
    rateLimit: number;
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
  disabled,
}: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={s.switch}
    >
      <span className={s.switchThumb} />
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  enabled,
  onChange,
  disabled,
}: { title: string; desc: string; enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className={s.toggleRow}>
      <div className={s.toggleRowText}>
        <span className={s.toggleTitle}>{title}</span>
        <span className={s.toggleDesc}>{desc}</span>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SaveBtn({ loading, onClick }: { loading: boolean; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button type="button" onClick={onClick} disabled={loading} className="at-btn at-btn--primary">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState<FormData>({
    general: {
      siteName: '',
      siteDescription: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: '',
      logoUrl: '',
    },
    email: { smtpServer: '', smtpPort: '', smtpUsername: '', smtpPassword: '' },
    maintenance: { maintenanceMode: false, maintenanceMessage: 'سایت در حال به‌روزرسانی است...' },
    social: { instagram: '', telegram: '', whatsapp: '', twitter: '' },
    advanced: {
      debugMode: false,
      cacheEnabled: true,
      apiRateLimit: true,
      cacheDuration: 60,
      maxUploadSize: 10,
      errorLevel: 'error',
      logPath: '',
      apiKey: '',
      cacheStorage: 'memory',
      rateLimit: 100,
    },
  });

  // ── Load initial settings ──────────────────────────────────────────────────
  useEffect(() => {
    getSystemSettings()
      .then((result) => {
        if (result.success && result.data) {
          const d = result.data as Record<string, unknown>;
          const pickString = (k: string): string =>
            typeof d[k] === 'string' ? (d[k] as string) : '';
          setForm((prev) => ({
            ...prev,
            general: {
              ...prev.general,
              siteTitle: pickString('siteName') || prev.general.siteTitle,
              siteDescription:
                pickString('siteDescription') || prev.general.siteDescription,
              contactEmail:
                pickString('contactEmail') || prev.general.contactEmail,
              contactPhone:
                pickString('contactPhone') || prev.general.contactPhone,
              contactAddress:
                pickString('contactAddress') || prev.general.contactAddress,
              logoUrl: pickString('logoUrl') || prev.general.logoUrl,
            },
            email: {
              ...prev.email,
              smtpServer: pickString('smtpServer') || prev.email.smtpServer,
              smtpPort: pickString('smtpPort') || prev.email.smtpPort,
              smtpUsername:
                pickString('smtpUsername') || prev.email.smtpUsername,
            },
            social: {
              ...prev.social,
              instagram: pickString('instagram') || prev.social.instagram,
              telegram: pickString('telegram') || prev.social.telegram,
              twitter: pickString('twitter') || prev.social.twitter,
              whatsapp: pickString('whatsapp') || prev.social.whatsapp,
            },
            maintenance: {
              ...prev.maintenance,
              maintenanceMode:
                typeof d.maintenanceMode === 'boolean'
                  ? d.maintenanceMode
                  : prev.maintenance.maintenanceMode,
            },
            advanced: {
              ...prev.advanced,
              cacheEnabled:
                typeof d.cacheEnabled === 'boolean'
                  ? d.cacheEnabled
                  : prev.advanced.cacheEnabled,
            },
          }));
        }
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const set = useCallback(
    <T extends keyof FormData>(tab: T, field: keyof FormData[T], value: unknown) => {
      setForm((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: value } }));
      setTestResult(null);
    },
    [],
  );

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleSaveGeneral = useCallback(async () => {
    setLoading(true);
    const r = await updateGeneralSettings({
      siteName: form.general.siteTitle,
      siteDescription: form.general.siteDescription,
      logoUrl: form.general.logoUrl,
      contactEmail: form.general.contactEmail,
      contactPhone: form.general.contactPhone,
      contactAddress: form.general.contactAddress,
    }).catch(() => ({ success: false, error: 'خطا در ذخیره' }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({ title: 'ذخیره شد', description: 'تنظیمات عمومی با موفقیت ذخیره شد' });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا در ذخیره',
        variant: 'destructive',
      });
  }, [form.general, toast]);

  const handleSaveEmail = useCallback(async () => {
    setLoading(true);
    const r = await updateEmailSettings(form.email).catch(() => ({
      success: false,
      error: 'خطا در ذخیره',
    }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({ title: 'ذخیره شد', description: 'تنظیمات ایمیل با موفقیت ذخیره شد' });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا',
        variant: 'destructive',
      });
  }, [form.email, toast]);

  const handleSaveAdvanced = useCallback(async () => {
    setLoading(true);
    const r = await updateCacheSettings({ cacheEnabled: form.advanced.cacheEnabled }).catch(() => ({
      success: false,
      error: 'خطا در ذخیره',
    }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({ title: 'ذخیره شد', description: 'تنظیمات پیشرفته ذخیره شد' });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا',
        variant: 'destructive',
      });
  }, [form.advanced.cacheEnabled, toast]);

  const handleSaveMaintenance = useCallback(async () => {
    setLoading(true);
    // 2026-07-29: maintenanceMessage هم ارسال می‌شود تا در صفحه /maintenance نمایش یابد
    const r = await updateMaintenanceMode({
      maintenanceMode: form.maintenance.maintenanceMode,
      maintenanceMessage: form.maintenance.maintenanceMessage,
    }).catch(() => ({ success: false, error: 'خطا در ذخیره' }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({
        title: form.maintenance.maintenanceMode ? 'حالت تعمیرات فعال شد' : 'سایت فعال شد',
        description: form.maintenance.maintenanceMode
          ? 'کاربران صفحه تعمیرات را مشاهده می‌کنند'
          : 'سایت برای همه در دسترس است',
      });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا',
        variant: 'destructive',
      });
  }, [form.maintenance.maintenanceMode, form.maintenance.maintenanceMessage, toast]);

  const handleTestSmtp = useCallback(async () => {
    setLoading(true);
    setTestResult(null);
    const r = await testSmtpConnection(form.email).catch(() => ({
      success: false,
      message: 'خطا در تست',
    }));
    setLoading(false);
    setTestResult({
      ok: (r as { success: boolean }).success,
      msg:
        (r as { message?: string; error?: string }).message ||
        (r as { error?: string }).error ||
        (r as { success: boolean }).success
          ? 'اتصال موفق'
          : 'اتصال ناموفق',
    });
  }, [form.email]);

  const handleGenerateApiKey = useCallback(async () => {
    setLoading(true);
    const r = await generateApiKey().catch(() => ({ success: false }));
    setLoading(false);
    if (
      (r as { success: boolean; data?: { apiKey: string } }).success &&
      (r as { data?: { apiKey: string } }).data?.apiKey
    ) {
      set('advanced', 'apiKey', (r as { data: { apiKey: string } }).data.apiKey);
      toast({ title: 'کلید تولید شد', description: 'کلید API جدید با موفقیت تولید شد' });
    }
  }, [set, toast]);

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      const fd = new FormData();
      fd.append('files', file);
      fd.append('folder', 'general');
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
        .then((r) => r.json())
        .catch(() => null);
      setLoading(false);
      if (res?.success && res.data?.files?.[0]?.url) {
        set('general', 'logoUrl', res.data.files[0].url);
        toast({ title: 'آپلود شد', description: 'لوگو با موفقیت آپلود شد' });
      } else {
        toast({
          title: 'خطا',
          description: res?.error?.message || 'خطا در آپلود',
          variant: 'destructive',
        });
      }
    },
    [set, toast],
  );

  if (initialLoading) {
    return (
      <div
        className="at-page"
        dir="rtl"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--at-accent)' }} />
      </div>
    );
  }

  return (
    <div className={`at-page ${s.page}`} dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تنظیمات' }]}
        eyebrow="سیستم"
        title="تنظیمات"
        description="تنظیمات سیستم، امنیت، ایمیل و شبکه‌های اجتماعی"
      />

      <div className={s.body}>
        {/* ── Sidebar ── */}
        <nav className={s.sidebar} aria-label="بخش‌های تنظیمات">
          {TAB_GROUPS.map((group) => (
            <div key={group.id} className={s.navGroup}>
              <div className={s.navGroupLabel}>{group.label}</div>
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setTestResult(null);
                    }}
                    className={`${s.navBtn} ${active ? s.navBtnActive : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={s.navBtnIcon}>
                      <Icon size={15} aria-hidden />
                    </span>
                    <span className={s.navBtnText}>
                      <span>{tab.name}</span>
                      <span className={s.navBtnDesc}>{tab.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Content ── */}
        <div className={s.content}>
          {/* ── General ── */}
          {activeTab === 'general' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Settings size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات عمومی سایت</div>
                    <div className="at-form-section__sub">اطلاعات اصلی و هویت سایت</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-grid">
                  <label className="at-field">
                    <span className="at-field__label">عنوان سایت</span>
                    <input
                      type="text"
                      className="at-input"
                      value={form.general.siteTitle}
                      onChange={(e) => set('general', 'siteTitle', e.target.value)}
                      placeholder="عنوان سایت را وارد کنید"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">توضیحات سایت</span>
                    <input
                      type="text"
                      className="at-input"
                      value={form.general.siteDescription}
                      onChange={(e) => set('general', 'siteDescription', e.target.value)}
                      placeholder="توضیحات کوتاه"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">ایمیل تماس</span>
                    <input
                      type="email"
                      className="at-input"
                      dir="ltr"
                      value={form.general.contactEmail}
                      onChange={(e) => set('general', 'contactEmail', e.target.value)}
                      placeholder="contact@example.com"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">شماره تماس</span>
                    <input
                      type="tel"
                      className="at-input"
                      dir="ltr"
                      value={form.general.contactPhone}
                      onChange={(e) => set('general', 'contactPhone', e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="at-field__label">آدرس دفتر مرکزی</span>
                    <input
                      type="text"
                      className="at-input"
                      value={form.general.contactAddress}
                      onChange={(e) =>
                        set('general', 'contactAddress', e.target.value)
                      }
                      placeholder="تهران، خیابان ...، پلاک ..."
                      disabled={loading}
                    />
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--at-fg-subtle)',
                        marginTop: '0.25rem',
                      }}
                    >
                      در فوتر و صفحه تماس نمایش داده می‌شود
                    </span>
                  </label>
                </div>

                {/* Logo upload */}
                <div style={{ marginTop: 'var(--ds-space-4)' }}>
                  <span
                    className="at-field__label"
                    style={{ display: 'block', marginBottom: 'var(--ds-space-2)' }}
                  >
                    لوگوی سایت
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--ds-space-4)',
                      padding: 'var(--ds-space-4)',
                      borderRadius: 'var(--at-radius)',
                      border: '1.5px dashed var(--at-line-strong)',
                      background: 'var(--at-bg-deep)',
                    }}
                  >
                    {form.general.logoUrl ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.general.logoUrl}
                          alt="لوگوی سایت"
                          style={{
                            height: '60px',
                            width: 'auto',
                            objectFit: 'contain',
                            borderRadius: 'var(--ds-radius-sm)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => set('general', 'logoUrl', '')}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            insetInlineEnd: '-8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'var(--at-danger)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="حذف لوگو"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: '60px',
                          width: '60px',
                          flexShrink: 0,
                          borderRadius: 'var(--ds-radius-sm)',
                          background: 'var(--at-bg-elevated)',
                          border: '1px solid var(--at-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ImageIcon size={24} style={{ color: 'var(--at-fg-subtle)' }} aria-hidden />
                      </div>
                    )}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--ds-space-2)',
                      }}
                    >
                      <input
                        type="text"
                        className="at-input"
                        dir="ltr"
                        value={form.general.logoUrl}
                        onChange={(e) => set('general', 'logoUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        disabled={loading}
                      />
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2)' }}
                      >
                        <label
                          className={`at-btn ${loading ? '' : 'cursor-pointer'}`}
                          style={{
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.5 : 1,
                          }}
                        >
                          <Upload size={14} />
                          آپلود لوگو
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={loading}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--at-fg-subtle)' }}>
                          یا URL وارد کنید
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <SaveBtn loading={loading} onClick={handleSaveGeneral} />
              </div>
            </div>
          )}

          {/* ── Email ── */}
          {activeTab === 'email' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Mail size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات SMTP</div>
                    <div className="at-form-section__sub">سرور ایمیل برای ارسال پیام‌ها</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-grid">
                  <label className="at-field">
                    <span className="at-field__label">سرور SMTP</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpServer}
                      onChange={(e) => set('email', 'smtpServer', e.target.value)}
                      placeholder="smtp.example.com"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">پورت</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpPort}
                      onChange={(e) => set('email', 'smtpPort', e.target.value)}
                      placeholder="587"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">نام کاربری</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpUsername}
                      onChange={(e) => set('email', 'smtpUsername', e.target.value)}
                      placeholder="user@example.com"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">رمز عبور</span>
                    <input
                      type="password"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpPassword}
                      onChange={(e) => set('email', 'smtpPassword', e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                {testResult && (
                  <div className={s.testResult} data-ok={String(testResult.ok)}>
                    {testResult.ok ? (
                      <CheckCircle2 size={15} aria-hidden />
                    ) : (
                      <XCircle size={15} aria-hidden />
                    )}
                    {testResult.msg}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 'var(--ds-space-2)',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={loading}
                    className="at-btn"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    تست اتصال
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEmail}
                    disabled={loading}
                    className="at-btn at-btn--primary"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    ذخیره تنظیمات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Maintenance Mode ── */}
          {activeTab === 'maintenance' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Shield size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">حالت تعمیرات و نگهداری</div>
                    <div className="at-form-section__sub">کنترل دسترسی کاربران به سایت</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div
                  className={s.maintenanceBanner}
                  data-active={String(form.maintenance.maintenanceMode)}
                  role="status"
                >
                  <div className={s.maintenanceBannerIcon} aria-hidden>
                    {form.maintenance.maintenanceMode ? (
                      <PowerOff size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    )}
                  </div>
                  <div className={s.maintenanceBannerText}>
                    <strong>
                      {form.maintenance.maintenanceMode
                        ? 'سایت در حالت تعمیرات است'
                        : 'سایت برای همه در دسترس است'}
                    </strong>
                    <span>
                      {form.maintenance.maintenanceMode
                        ? 'کاربران صفحه تعمیرات را می‌بینند؛ فقط مدیران ارشد به داشبورد دسترسی دارند.'
                        : 'با فعال‌سازی، سایت موقتاً به حالت تعمیرات می‌رود.'}
                    </span>
                  </div>
                </div>

                <div className="at-form-stack" style={{ gap: 'var(--ds-space-2)' }}>
                  <ToggleRow
                    title="فعال‌سازی حالت تعمیرات"
                    desc="نمایش صفحه تعمیرات به جای سایت اصلی برای بازدیدکنندگان"
                    enabled={form.maintenance.maintenanceMode}
                    onChange={() =>
                      set('maintenance', 'maintenanceMode', !form.maintenance.maintenanceMode)
                    }
                    disabled={loading}
                  />
                </div>

                <label className="at-field" style={{ marginTop: 'var(--ds-space-4)' }}>
                  <span className="at-field__label">پیام به کاربران (نمایش در صفحه تعمیرات)</span>
                  <textarea
                    className="at-input"
                    rows={3}
                    value={form.maintenance.maintenanceMessage}
                    onChange={(e) => set('maintenance', 'maintenanceMessage', e.target.value)}
                    disabled={loading}
                    placeholder="مثال: در حال به‌روزرسانی هستیم، لطفاً چند دقیقه دیگر مراجعه کنید..."
                  />
                </label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--ds-space-2)',
                    paddingTop: 'var(--ds-space-3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <p className={s.maintenanceHint}>
                    تغییرات بلافاصله پس از ذخیره اعمال می‌شوند. فقط نقش «مدیر ارشد» می‌تواند این
                    تنظیم را تغییر دهد.
                  </p>
                  <button
                    type="button"
                    disabled={loading}
                    className="at-btn at-btn--primary"
                    onClick={handleSaveMaintenance}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    ذخیره تنظیمات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Social ── */}
          {activeTab === 'social' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Share2 size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">شبکه‌های اجتماعی</div>
                    <div className="at-form-section__sub">لینک‌های خارجی سایت</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <SocialLinksManager />
              </div>
            </div>
          )}

          {/* ── Advanced ── */}
          {activeTab === 'advanced' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Wrench size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات پیشرفته</div>
                    <div className="at-form-section__sub">cache، API key و عملکرد</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-stack" style={{ gap: 'var(--ds-space-2)' }}>
                  <ToggleRow
                    title="کش فعال"
                    desc="فعال‌سازی cache برای بهبود عملکرد سایت"
                    enabled={form.advanced.cacheEnabled}
                    onChange={() => set('advanced', 'cacheEnabled', !form.advanced.cacheEnabled)}
                    disabled={loading}
                  />
                  <ToggleRow
                    title="محدودیت نرخ API"
                    desc="جلوگیری از درخواست‌های بیش از حد"
                    enabled={form.advanced.apiRateLimit}
                    onChange={() => set('advanced', 'apiRateLimit', !form.advanced.apiRateLimit)}
                    disabled={loading}
                  />
                  <ToggleRow
                    title="حالت اشکال‌زدایی"
                    desc="فعال‌سازی لاگ‌های دقیق برای توسعه"
                    enabled={form.advanced.debugMode}
                    onChange={() => set('advanced', 'debugMode', !form.advanced.debugMode)}
                    disabled={loading}
                  />
                </div>

                <div className="at-form-grid" style={{ marginTop: 'var(--ds-space-4)' }}>
                  <label className="at-field">
                    <span className="at-field__label">مدت cache (ثانیه)</span>
                    <input
                      type="number"
                      className="at-input"
                      dir="ltr"
                      value={form.advanced.cacheDuration}
                      onChange={(e) =>
                        set('advanced', 'cacheDuration', Number.parseInt(e.target.value) || 60)
                      }
                      disabled={loading}
                      min={10}
                      max={3600}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">حداکثر آپلود (MB)</span>
                    <input
                      type="number"
                      className="at-input"
                      dir="ltr"
                      value={form.advanced.maxUploadSize}
                      onChange={(e) =>
                        set('advanced', 'maxUploadSize', Number.parseInt(e.target.value) || 10)
                      }
                      disabled={loading}
                      min={1}
                      max={100}
                    />
                  </label>
                </div>

                {/* API Key */}
                <div style={{ marginTop: 'var(--ds-space-4)' }}>
                  <label className="at-field">
                    <span className="at-field__label">کلید API سایت</span>
                    <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
                      <input
                        type="text"
                        className="at-input"
                        dir="ltr"
                        value={form.advanced.apiKey}
                        readOnly
                        disabled={loading}
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '0.75rem',
                          background: 'var(--at-bg-deep)',
                        }}
                        placeholder="برای تولید، دکمه تولید را بزنید"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateApiKey}
                        disabled={loading}
                        className="at-btn"
                        style={{ flexShrink: 0 }}
                      >
                        {loading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        تولید
                      </button>
                    </div>
                  </label>
                </div>

                <SaveBtn loading={loading} onClick={handleSaveAdvanced} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
