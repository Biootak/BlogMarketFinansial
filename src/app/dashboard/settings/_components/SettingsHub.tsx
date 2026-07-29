'use client';

/**
 * SettingsHub — client component اصلی صفحه تنظیمات (داشبورد).
 * ─────────────────────────────────────────────────────────────
 *  الگو: progressive disclosure با sidebar tabs.
 *  هر tab یک پنل دارد که با StickySaveBar sync می‌شود.
 *  RightRailPreview در سمت راست تغییرات فرم را real-time نمایش می‌دهد.
 *
 *  تب‌ها:
 *    - general:  تنظیمات عمومی سایت + لوگو
 *    - email:    SMTP + تست اتصال
 *    - maintenance: حالت تعمیرات + پیام
 *    - social:   شبکه‌های اجتماعی (delegate به SocialLinksManager)
 *    - advanced: cache + rate-limit + debug
 *    - security: 2FA، session، IP allowlist (NEW)
 *    - api-keys: کلیدهای API (NEW)
 *    - backup:   پشتیبان‌گیری خودکار (NEW)
 *    - audit:    لاگ رویدادها (NEW)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  CheckCircle2,
  Database,
  ImageIcon,
  type LucideIcon,
  Mail,
  PowerOff,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  KeyRound,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Share2,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import { RightRailPreview, type PreviewTab } from './RightRailPreview';
import { SettingsSearch, type SearchableField, type SearchableTab } from './SettingsSearch';
import { SecuritySettings } from './SecuritySettings';
import { ApiKeysManager } from './ApiKeysManager';
import { BackupManager } from './BackupManager';
import { AuditLog } from './AuditLog';
import SocialLinksManager from '@/components/Dashboard/Settings/SocialLinksManager';
import {
  StickySaveBar,
  SettingsSubNav,
  type SettingsSubNavItem,
} from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import {
  generateApiKey,
  getBackupStatus,
  testDatabaseConnection,
  testSmtpConnection,
  updateCacheSettings,
  updateEmailSettings,
  updateGeneralSettings,
  updateMaintenanceMode,
} from '@/actions/settingsActions';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import s from './SettingsHub.module.css';

export interface SettingsHubProps {
  initialData: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    logoUrl: string;
    smtpServer: string;
    smtpPort: string;
    smtpUsername: string;
    smtpPassword: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    cacheEnabled: boolean;
  };
}

interface FormState {
  general: {
    siteTitle: string;
    siteDescription: string;
    siteUrl: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    logoUrl: string;
  };
  email: {
    smtpServer: string;
    smtpPort: string;
    smtpUsername: string;
    smtpPassword: string;
  };
  maintenance: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  advanced: {
    cacheEnabled: boolean;
  };
}

const searchableTabs: SearchableTab[] = [
  { id: 'general', label: 'هویت سایت', iconName: 'settings' },
  { id: 'email', label: 'ایمیل', iconName: 'mail' },
  { id: 'maintenance', label: 'تعمیرات', iconName: 'power' },
  { id: 'social', label: 'شبکه‌های اجتماعی', iconName: 'share' },
  { id: 'advanced', label: 'پیشرفته', iconName: 'wrench' },
  { id: 'security', label: 'امنیت', iconName: 'shield' },
  { id: 'api-keys', label: 'کلیدهای API', iconName: 'key' },
  { id: 'backup', label: 'پشتیبان‌گیری', iconName: 'archive' },
  { id: 'audit', label: 'لاگ رویدادها', iconName: 'activity' },
];

const searchableFields: SearchableField[] = [
  { tab: 'general', fieldId: 'siteTitle', label: 'عنوان سایت', hint: 'نام اصلی' },
  { tab: 'general', fieldId: 'siteUrl', label: 'آدرس سایت', hint: 'https://...' },
  { tab: 'general', fieldId: 'siteDescription', label: 'توضیحات سایت' },
  { tab: 'general', fieldId: 'contactEmail', label: 'ایمیل تماس' },
  { tab: 'general', fieldId: 'contactPhone', label: 'شماره تماس' },
  { tab: 'email', fieldId: 'smtpServer', label: 'سرور SMTP' },
  { tab: 'email', fieldId: 'smtpPort', label: 'پورت SMTP' },
  { tab: 'email', fieldId: 'smtpUsername', label: 'نام کاربری SMTP' },
  { tab: 'maintenance', fieldId: 'maintenanceMessage', label: 'پیام تعمیرات' },
];

export function SettingsHub({ initialData }: SettingsHubProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('general');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    general: {
      siteTitle: initialData.siteName,
      siteDescription: initialData.siteDescription,
      siteUrl: initialData.siteUrl,
      contactEmail: initialData.contactEmail,
      contactPhone: initialData.contactPhone,
      contactAddress: initialData.contactAddress,
      logoUrl: initialData.logoUrl,
    },
    email: {
      smtpServer: initialData.smtpServer,
      smtpPort: initialData.smtpPort,
      smtpUsername: initialData.smtpUsername,
      smtpPassword: initialData.smtpPassword,
    },
    maintenance: {
      maintenanceMode: initialData.maintenanceMode,
      maintenanceMessage: initialData.maintenanceMessage,
    },
    advanced: {
      cacheEnabled: initialData.cacheEnabled,
    },
  }));

  const [original, setOriginal] = useState<FormState>(form);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [counts, setCounts] = useState({
    apiKeys: 0,
    backups: 0,
    lastBackupAt: null as string | null,
    nextBackupAt: null as string | null,
    backupEnabled: true,
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const setSiteSettings = useSiteSettings((st) => st.setSettings);
  const tabAnchorRef = useRef<HTMLDivElement>(null);

  // load sidecar data for RightRailPreview + tab badges
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [backupRes, apiKeysRes] = await Promise.all([
          getBackupStatus(),
          fetch('/api/settings/api-keys', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : { data: [] }))
            .catch(() => ({ data: [] })),
        ]);
        if (!active) return;
        if (backupRes.success && backupRes.data) {
          setCounts({
            apiKeys: Array.isArray(apiKeysRes.data) ? apiKeysRes.data.length : 0,
            backups: backupRes.data.backups.length,
            lastBackupAt: backupRes.data.lastBackupAt,
            nextBackupAt: backupRes.data.nextScheduledAt,
            backupEnabled: backupRes.data.config.enabled,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const dirtyByTab = useMemo(() => {
    const map: Record<string, boolean> = {};
    (['general', 'email', 'maintenance', 'advanced'] as const).forEach((t) => {
      map[t] = JSON.stringify(form[t]) !== JSON.stringify(original[t]);
    });
    return map as Record<PreviewTab, boolean>;
  }, [form, original]);

  const anyDirty = Object.values(dirtyByTab).some(Boolean) || securityDirty;

  const set = useCallback(
    <T extends keyof FormState>(tab: T, field: keyof FormState[T], value: unknown) => {
      setForm((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: value } }));
      setTestResult(null);
      // mark dirty via functional setter to avoid re-creating `set` on every saveStatus change
      setSaveStatus((s) => (s === 'idle' || s === 'saved' ? 'dirty' : s));
    },
    [],
  );

  // sync saveStatus with anyDirty (e.g. when SecuritySettings reports dirty)
  useEffect(() => {
    if (anyDirty) {
      setSaveStatus((s) => (s === 'idle' || s === 'saved' ? 'dirty' : s));
    } else {
      setSaveStatus((s) => (s === 'dirty' ? 'idle' : s));
    }
  }, [anyDirty]);

  const handleSaveAll = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const tasks: Array<Promise<{ success: boolean; error?: unknown }>> = [];
      if (dirtyByTab.general) {
        tasks.push(
          updateGeneralSettings({
            siteName: form.general.siteTitle,
            siteDescription: form.general.siteDescription,
            logoUrl: form.general.logoUrl,
            siteUrl: form.general.siteUrl,
            contactEmail: form.general.contactEmail,
            contactPhone: form.general.contactPhone,
            contactAddress: form.general.contactAddress,
          }) as unknown as Promise<{ success: boolean; error?: unknown }>,
        );
      }
      if (dirtyByTab.email) {
        tasks.push(
          updateEmailSettings(form.email) as unknown as Promise<{ success: boolean; error?: unknown }>,
        );
      }
      if (dirtyByTab.maintenance) {
        tasks.push(
          updateMaintenanceMode(form.maintenance) as unknown as Promise<{
            success: boolean;
            error?: unknown;
          }>,
        );
      }
      if (dirtyByTab.advanced) {
        tasks.push(
          updateCacheSettings(form.advanced) as unknown as Promise<{
            success: boolean;
            error?: unknown;
          }>,
        );
      }
      const results = await Promise.all(tasks);
      const failed = results.find((r) => !r.success);
      if (failed) {
        setSaveStatus('error');
        toast({
          title: 'خطا',
          description: 'برخی تنظیمات ذخیره نشد',
          variant: 'destructive',
        });
      } else {
        setOriginal(form);
        if (dirtyByTab.general) {
          setSiteSettings({
            siteName: form.general.siteTitle,
            siteDescription: form.general.siteDescription,
            logoUrl: form.general.logoUrl,
          });
        }
        setSaveStatus('saved');
        toast({
          title: 'ذخیره شد',
          description: 'همه تغییرات با موفقیت ذخیره شدند',
        });
      }
    } catch (_e) {
      setSaveStatus('error');
    }
  }, [dirtyByTab, form, toast, setSiteSettings]);

  const handleReset = useCallback(() => {
    setForm(original);
  }, [original]);

  const onChangeTab = useCallback((tab: string) => {
    setActiveTab(tab as PreviewTab);
    setTestResult(null);
    requestAnimationFrame(() => {
      tabAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleTestSmtp = useCallback(async () => {
    setLoading(true);
    setTestResult(null);
    const r = await testSmtpConnection(form.email).catch(() => ({
      success: false,
      message: 'خطا در تست',
    }));
    setLoading(false);
    const ok = (r as { success: boolean }).success;
    setTestResult({
      ok,
      msg: (r as { message?: string }).message || (ok ? 'اتصال موفق' : 'اتصال ناموفق'),
    });
  }, [form.email]);

  const handleTestDb = useCallback(async () => {
    setLoading(true);
    const r = await testDatabaseConnection();
    setLoading(false);
    if (r.success) {
      toast({ title: 'اتصال موفق', description: 'پایگاه داده پاسخ می‌دهد' });
    } else {
      toast({ title: 'خطا', description: 'اتصال برقرار نیست', variant: 'destructive' });
    }
  }, [toast]);

  const handleGenerateApiKey = useCallback(async () => {
    setLoading(true);
    const r = await generateApiKey();
    setLoading(false);
    if ((r as { success: boolean; data?: { apiKey: string } }).success) {
      const apiKey = (r as { data?: { apiKey: string } }).data?.apiKey;
      if (apiKey) {
        await navigator.clipboard.writeText(apiKey).catch(() => null);
        toast({ title: 'کلید تولید شد', description: 'کلید کپی شد' });
      }
    }
  }, [toast]);

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
        set('general', 'logoUrl', res.data.files[0].url as string);
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

  return (
    <div className={s.hub} data-tab={activeTab} dir="rtl">
      <div className={s.bgPattern} aria-hidden />
      {/* Header */}
      <header className={s.pageHead}>
        <div className={s.pageHeadText}>
          <div className={s.crumbRow}>
            <span className={s.crumb}>داشبورد</span>
            <span className={s.crumbSep}>›</span>
            <span className={s.crumbActive}>تنظیمات</span>
          </div>
          <h1 className={s.title}>تنظیمات سیستم</h1>
          <p className={s.subtitle}>
            پیکربندی هویت سایت، ارتباطات، امنیت و نگهداری — همه در یک‌جا
          </p>
        </div>
        <div className={s.pageHeadMeta}>
          <SettingsSearch
            tabs={searchableTabs}
            fields={searchableFields}
            activeTab={activeTab}
            onChangeTab={onChangeTab}
            onFocusField={(id) => {
              const el = document.getElementById(id);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el?.focus({ preventScroll: true });
            }}
          />
          <StatusPill
            label="backup"
            ok={counts.backupEnabled}
            count={counts.backups}
          />
        </div>
      </header>

      <div className={s.body}>
        {/* Sidebar nav */}
        <aside className={s.sidebar} aria-label="دسته‌بندی تنظیمات">
          <SettingsSubNav
            items={buildNavItems(counts, dirtyByTab, securityDirty)}
            activeKey={activeTab}
            asTabs
            onSelect={onChangeTab}
          />
        </aside>

        {/* Main panel */}
        <main className={s.main} ref={tabAnchorRef}>
          {activeTab === 'general' && (
            <Panel
              title="تنظیمات عمومی سایت"
              description="اطلاعات اصلی و هویت سایت"
              icon={SettingsIcon}
            >
              <div className={s.formGrid}>
                <Field id="siteTitle" label="عنوان سایت">
                  <input
                    id="siteTitle"
                    type="text"
                    className={s.input}
                    value={form.general.siteTitle}
                    onChange={(e) => set('general', 'siteTitle', e.target.value)}
                    placeholder="عنوان سایت را وارد کنید"
                    disabled={loading}
                  />
                </Field>
                <Field id="siteUrl" label="آدرس سایت" dir="ltr">
                  <input
                    id="siteUrl"
                    type="url"
                    dir="ltr"
                    className={s.input}
                    value={form.general.siteUrl}
                    onChange={(e) => set('general', 'siteUrl', e.target.value)}
                    placeholder="https://financialmarket.page"
                    disabled={loading}
                  />
                  <p className={s.fieldHint}>
                    در sitemap، robots.txt و لینک‌های اشتراک‌گذاری استفاده می‌شود
                  </p>
                </Field>
                <Field id="siteDescription" label="توضیحات سایت">
                  <input
                    id="siteDescription"
                    type="text"
                    className={s.input}
                    value={form.general.siteDescription}
                    onChange={(e) => set('general', 'siteDescription', e.target.value)}
                    placeholder="توضیحات کوتاه"
                    disabled={loading}
                  />
                </Field>
                <Field id="contactEmail" label="ایمیل تماس" dir="ltr">
                  <input
                    id="contactEmail"
                    type="email"
                    dir="ltr"
                    className={s.input}
                    value={form.general.contactEmail}
                    onChange={(e) => set('general', 'contactEmail', e.target.value)}
                    placeholder="contact@example.com"
                    disabled={loading}
                  />
                </Field>
                <Field id="contactPhone" label="شماره تماس" dir="ltr">
                  <input
                    id="contactPhone"
                    type="tel"
                    dir="ltr"
                    className={s.input}
                    value={form.general.contactPhone}
                    onChange={(e) => set('general', 'contactPhone', e.target.value)}
                    placeholder="۰۷۰۰۰۰۰۰۰۰"
                    disabled={loading}
                  />
                </Field>
                <Field id="contactAddress" label="آدرس دفتر مرکزی">
                  <input
                    id="contactAddress"
                    type="text"
                    className={s.input}
                    value={form.general.contactAddress}
                    onChange={(e) => set('general', 'contactAddress', e.target.value)}
                    placeholder="کابل، خیابان …"
                    disabled={loading}
                  />
                  <p className={s.fieldHint}>در فوتر و صفحه تماس نمایش داده می‌شود</p>
                </Field>
              </div>

              {/* Logo upload */}
              <div className={s.logoBlock}>
                <span className={s.fieldLabel}>لوگوی سایت</span>
                <div className={s.logoRow}>
                  {form.general.logoUrl ? (
                    <div className={s.logoPreviewWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.general.logoUrl} alt="لوگو" className={s.logoPreview} />
                      <button
                        type="button"
                        onClick={() => set('general', 'logoUrl', '')}
                        className={s.logoRemove}
                        aria-label="حذف لوگو"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={s.logoEmpty} aria-hidden>
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className={s.logoFields}>
                    <input
                      type="text"
                      className={s.input}
                      dir="ltr"
                      value={form.general.logoUrl}
                      onChange={(e) => set('general', 'logoUrl', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      disabled={loading}
                    />
                    <div className={s.logoActions}>
                      <label className={s.uploadBtn}>
                        <Upload size={13} strokeWidth={2.2} />
                        <span>آپلود لوگو</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={loading}
                          className={s.fileInput}
                        />
                      </label>
                      <span className={s.fieldHint}>یا URL وارد کنید</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'email' && (
            <Panel title="تنظیمات SMTP" description="سرور ایمیل برای ارسال پیام‌ها" icon={Mail}>
              <div className={s.formGrid}>
                <Field id="smtpServer" label="سرور SMTP" dir="ltr">
                  <input
                    id="smtpServer"
                    type="text"
                    dir="ltr"
                    className={s.input}
                    value={form.email.smtpServer}
                    onChange={(e) => set('email', 'smtpServer', e.target.value)}
                    placeholder="smtp.example.com"
                    disabled={loading}
                  />
                </Field>
                <Field id="smtpPort" label="پورت" dir="ltr">
                  <input
                    id="smtpPort"
                    type="text"
                    dir="ltr"
                    className={s.input}
                    value={form.email.smtpPort}
                    onChange={(e) => set('email', 'smtpPort', e.target.value)}
                    placeholder="587"
                    disabled={loading}
                  />
                </Field>
                <Field id="smtpUsername" label="نام کاربری" dir="ltr">
                  <input
                    id="smtpUsername"
                    type="text"
                    dir="ltr"
                    className={s.input}
                    value={form.email.smtpUsername}
                    onChange={(e) => set('email', 'smtpUsername', e.target.value)}
                    placeholder="user@example.com"
                    disabled={loading}
                    autoComplete="off"
                  />
                </Field>
                <Field id="smtpPassword" label="رمز عبور" dir="ltr">
                  <input
                    id="smtpPassword"
                    type="password"
                    dir="ltr"
                    className={s.input}
                    value={form.email.smtpPassword}
                    onChange={(e) => set('email', 'smtpPassword', e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              {testResult && (
                <div className={s.testResult} data-ok={String(testResult.ok)}>
                  {testResult.ok ? (
                    <CheckCircle2 size={15} aria-hidden />
                  ) : (
                    <XCircle size={15} aria-hidden />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}

              <div className={s.actionRow}>
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={loading}
                  className={s.btnSecondary}
                >
                  <Mail size={13} strokeWidth={2.2} />
                  <span>تست اتصال</span>
                </button>
              </div>
            </Panel>
          )}

          {activeTab === 'maintenance' && (
            <Panel
              title="حالت تعمیرات و نگهداری"
              description="کنترل دسترسی کاربران به سایت"
              icon={Shield}
            >
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

              <div className={s.toggleStack}>
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

              <div className={s.field}>
                <label htmlFor="maintenanceMessage" className={s.fieldLabel}>
                  پیام به کاربران
                </label>
                <textarea
                  id="maintenanceMessage"
                  className={s.textarea}
                  rows={3}
                  value={form.maintenance.maintenanceMessage}
                  onChange={(e) => set('maintenance', 'maintenanceMessage', e.target.value)}
                  disabled={loading}
                  placeholder="مثال: در حال به‌روزرسانی هستیم، لطفاً چند دقیقه دیگر مراجعه کنید..."
                />
              </div>
            </Panel>
          )}

          {activeTab === 'social' && (
            <Panel
              title="شبکه‌های اجتماعی"
              description="لینک‌های خارجی سایت"
              icon={Share2}
            >
              <SocialLinksManager />
            </Panel>
          )}

          {activeTab === 'advanced' && (
            <Panel
              title="تنظیمات پیشرفته"
              description="cache، rate-limit و عملکرد"
              icon={Wrench}
            >
              <div className={s.toggleStack}>
                <ToggleRow
                  title="کش فعال"
                  desc="فعال‌سازی cache برای بهبود عملکرد سایت"
                  enabled={form.advanced.cacheEnabled}
                  onChange={() => set('advanced', 'cacheEnabled', !form.advanced.cacheEnabled)}
                  disabled={loading}
                />
              </div>
              <div className={s.actionRow}>
                <button type="button" onClick={handleTestDb} className={s.btnSecondary} disabled={loading}>
                  <Database size={13} strokeWidth={2.2} />
                  <span>تست اتصال پایگاه داده</span>
                </button>
                <button type="button" onClick={handleGenerateApiKey} className={s.btnSecondary} disabled={loading}>
                  {loading ? <Loader2 size={13} className={s.spin} /> : <RefreshCw size={13} strokeWidth={2.2} />}
                  <span>تولید کلید یکبارمصرف</span>
                </button>
              </div>
            </Panel>
          )}

          {activeTab === 'security' && (
            <Panel
              title="امنیت"
              description="Session، IP allowlist، 2FA و نگهداری audit log"
              icon={ShieldCheck}
            >
              <SecuritySettings onDirtyChange={setSecurityDirty} />
            </Panel>
          )}

          {activeTab === 'api-keys' && (
            <Panel
              title="کلیدهای API"
              description="دسترسی برنامه‌ای به API"
              icon={KeyRound}
            >
              <ApiKeysManager />
            </Panel>
          )}

          {activeTab === 'backup' && (
            <Panel
              title="پشتیبان‌گیری"
              description="backup خودکار و دستی"
              icon={Archive}
            >
              <BackupManager />
            </Panel>
          )}

          {activeTab === 'audit' && (
            <Panel
              title="لاگ رویدادها"
              description="تاریخچه کامل اقدامات ادمین"
              icon={Activity}
            >
              <AuditLog />
            </Panel>
          )}
        </main>

        {/* Right rail preview */}
        <div className={s.rail}>
          <RightRailPreview
            activeTab={activeTab}
            siteName={form.general.siteTitle}
            siteDescription={form.general.siteDescription}
            siteUrl={form.general.siteUrl}
            contactEmail={form.general.contactEmail}
            contactPhone={form.general.contactPhone}
            contactAddress={form.general.contactAddress}
            smtpServer={form.email.smtpServer}
            smtpPort={form.email.smtpPort}
            smtpUsername={form.email.smtpUsername}
            smtpHasPassword={Boolean(form.email.smtpPassword)}
            maintenanceMode={form.maintenance.maintenanceMode}
            maintenanceMessage={form.maintenance.maintenanceMessage}
            apiKeyCount={counts.apiKeys}
            backupEnabled={counts.backupEnabled}
            lastBackupAt={counts.lastBackupAt}
            nextBackupAt={counts.nextBackupAt}
            backupCount={counts.backups}
          />
        </div>
      </div>

      {/* Sticky save bar — فقط وقتی dirty است */}
      <StickySaveBar
        status={saveStatus}
        onSave={handleSaveAll}
        onDiscard={handleReset}
      />
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function buildNavItems(
  counts: { apiKeys: number; backups: number; backupEnabled: boolean },
  dirty: Record<PreviewTab, boolean>,
  securityDirty: boolean,
): SettingsSubNavItem[] {
  return [
    {
      key: 'general',
      href: '#',
      label: 'هویت سایت',
      description: 'نام، لوگو، آدرس',
      iconName: 'settings',
      ...(dirty.general ? { badge: { label: 'تغییر', tone: 'warn' as const } } : {}),
    },
    {
      key: 'email',
      href: '#',
      label: 'ایمیل',
      description: 'SMTP و ارسال',
      iconName: 'mail',
      ...(dirty.email ? { badge: { label: 'تغییر', tone: 'warn' as const } } : {}),
    },
    {
      key: 'maintenance',
      href: '#',
      label: 'تعمیرات',
      description: 'حالت تعمیر سایت',
      iconName: 'power',
      ...(dirty.maintenance ? { badge: { label: 'تغییر', tone: 'warn' as const } } : {}),
    },
    {
      key: 'social',
      href: '#',
      label: 'شبکه‌های اجتماعی',
      description: 'کانال‌های ارتباطی',
      iconName: 'users',
    },
    {
      key: 'advanced',
      href: '#',
      label: 'پیشرفته',
      description: 'Cache و rate-limit',
      iconName: 'database',
      ...(dirty.advanced ? { badge: { label: 'تغییر', tone: 'warn' as const } } : {}),
    },
    {
      key: 'security',
      href: '#',
      label: 'امنیت',
      description: 'Session، 2FA، IP',
      iconName: 'shield',
      ...(securityDirty ? { badge: { label: 'تغییر', tone: 'warn' as const } } : {}),
    },
    {
      key: 'api-keys',
      href: '#',
      label: 'کلیدهای API',
      description: 'دسترسی برنامه‌ای',
      iconName: 'key',
      ...(counts.apiKeys > 0
        ? { badge: { label: String(counts.apiKeys), tone: 'info' as const } }
        : {}),
    },
    {
      key: 'backup',
      href: '#',
      label: 'پشتیبان‌گیری',
      description: 'backup خودکار',
      iconName: 'archive',
      badge: counts.backupEnabled
        ? counts.backups > 0
          ? { label: String(counts.backups), tone: 'success' as const }
          : { label: 'خالی', tone: 'warn' as const }
        : { label: 'خاموش', tone: 'neutral' as const },
    },
    {
      key: 'audit',
      href: '#',
      label: 'لاگ رویدادها',
      description: 'تاریخچه اقدامات',
      iconName: 'activity',
    },
  ];
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className={s.panel}>
      <header className={s.panelHead}>
        <div className={s.panelIcon} aria-hidden>
          <Icon size={16} strokeWidth={2} />
        </div>
        <div className={s.panelInfo}>
          <h2 className={s.panelTitle}>{title}</h2>
          <p className={s.panelDesc}>{description}</p>
        </div>
      </header>
      <div className={s.panelBody}>{children}</div>
    </div>
  );
}

function Field({
  id,
  label,
  dir,
  children,
}: {
  id: string;
  label: string;
  dir?: 'ltr' | 'rtl';
  children: React.ReactNode;
}) {
  return (
    <div className={s.field} dir={dir}>
      <label htmlFor={id} className={s.fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  enabled,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={s.toggleRow}>
      <div className={s.toggleRowText}>
        <span className={s.toggleTitle}>{title}</span>
        <span className={s.toggleDesc}>{desc}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onChange}
        disabled={disabled}
        className={s.toggleSwitch}
        data-on={enabled}
      >
        <span className={s.toggleKnob} />
      </button>
    </div>
  );
}

function StatusPill({
  label,
  ok,
  count,
}: {
  label: string;
  ok: boolean;
  count?: number;
}) {
  return (
    <span className={s.pill} data-ok={ok}>
      <span className={s.pillDot} aria-hidden />
      <span className={s.pillLabel}>{label}</span>
      {typeof count === 'number' && <span className={s.pillVal}>{count}</span>}
    </span>
  );
}
