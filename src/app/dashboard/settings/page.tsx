'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  Mail,
  Shield,
  Share2,
  Database,
  Wrench,
  Check,
  RefreshCw,
  Loader2,
  Upload,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/Dashboard/primitives';
import {
  getSystemSettings,
  updateGeneralSettings,
  updateEmailSettings,
  updateCacheSettings,
  testDatabaseConnection,
  testSmtpConnection,
  generateApiKey,
} from '@/actions/settingsActions';
import SocialLinksManager from '@/components/Dashboard/Settings/SocialLinksManager';

interface TabType {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

const tabs: TabType[] = [
  { id: 'general', name: 'تنظیمات عمومی', icon: Settings, description: 'تنظیمات اصلی سایت' },
  { id: 'email', name: 'تنظیمات ایمیل', icon: Mail, description: 'پیکربندی SMTP' },
  { id: 'security', name: 'تنظیمات امنیتی', icon: Shield, description: 'امنیت و دسترسی' },
  { id: 'social', name: 'شبکه‌های اجتماعی', icon: Share2, description: 'اتصال به شبکه‌ها' },
  { id: 'database', name: 'پایگاه داده', icon: Database, description: 'مدیریت دیتابیس' },
  { id: 'advanced', name: 'تنظیمات پیشرفته', icon: Wrench, description: 'تنظیمات حرفه‌ای' },
];

interface SettingsFormData {
  general: { siteTitle: string; siteDescription: string; contactEmail: string; logoUrl: string };
  email: { smtpServer: string; smtpPort: string; smtpUsername: string; smtpPassword: string };
  security: { twoFactorAuth: boolean; ipRestriction: boolean; minPasswordLength: number; sessionDuration: number };
  social: { instagram: string; telegram: string; whatsapp: string; twitter: string };
  database: { server: string; port: string; name: string; username: string; password: string; type: string; autoBackup: boolean };
  advanced: { debugMode: boolean; cacheEnabled: boolean; apiRateLimit: boolean; cacheDuration: number; maxUploadSize: number; errorLevel: string; logPath: string; apiKey: string; cacheStorage: string; rateLimit: number };
}

// Toggle Switch Component — atelier (hairline + emerald)
const ToggleSwitch = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2 ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    } ${enabled ? 'bg-[color:var(--at-accent)]' : 'bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)]'}`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${enabled ? '-translate-x-6' : '-translate-x-1'}`} />
  </button>
);

// Input Field Component — atelier
const InputField = ({ label, type = 'text', value, onChange, placeholder, readOnly = false, disabled = false }: { label: string; type?: string; value: string | number; onChange: (value: string) => void; placeholder?: string; readOnly?: boolean; disabled?: boolean }) => (
  <div className="space-y-2">
    {label && <label className="at-field__label block">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      className={`at-input ${readOnly || disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      style={readOnly ? { background: 'var(--at-bg-deep)', fontFamily: 'ui-monospace, monospace', fontSize: '12px' } : undefined}
    />
  </div>
);

// Select Field Component — atelier
const SelectField = ({ label, value, onChange, options, disabled = false }: { label: string; value: string | number; onChange: (value: string) => void; options: { value: string | number; label: string }[]; disabled?: boolean }) => (
  <div className="space-y-2">
    <label className="at-field__label block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="at-select w-full"
      style={{ height: 'auto', padding: '10px 14px', fontSize: '13px', fontWeight: '500' }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Setting Toggle Row — atelier
const SettingToggleRow = ({ title, description, enabled, onChange, disabled }: { title: string; description: string; enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[var(--at-radius)] border border-[color:var(--at-line)] bg-[color:var(--at-bg)] transition-colors hover:bg-[color:var(--at-surface-hover)]">
    <div className="space-y-0.5 min-w-0">
      <h4 className="text-sm font-semibold text-[color:var(--at-fg)]">{title}</h4>
      <p className="text-xs text-[color:var(--at-fg-subtle)]">{description}</p>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
);

// Card Section — atelier
const CardSection = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <div className="at-form-section">
    <div className="at-form-section__head">
      <div className="at-form-section__title">
        <span className="at-form-section__ico">
          <Settings className="size-4" />
        </span>
        <div>
          <div className="at-form-section__title-text">{title}</div>
          <div className="at-form-section__sub">{description}</div>
        </div>
      </div>
    </div>
    <div className="at-form-section__body at-form-stack at-form-stack--lg">
      {children}
    </div>
  </div>
);

// Action Buttons — atelier
const ActionButtons = ({ onReset, onSubmit, loading, disabled }: { onReset?: () => void; onSubmit?: () => void; loading?: boolean; disabled?: boolean }) => (
  <div className="flex items-center justify-end gap-2 pt-2">
    {onReset && (
      <button type="button" onClick={onReset} disabled={loading || disabled} className="at-btn">
        <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        بازنشانی
      </button>
    )}
    {onSubmit && (
      <button type="button" onClick={onSubmit} disabled={loading || disabled} className="at-btn at-btn--primary">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
      </button>
    )}
  </div>
);

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<SettingsFormData>({
    general: { siteTitle: '', siteDescription: '', contactEmail: '', logoUrl: '' },
    email: { smtpServer: '', smtpPort: '', smtpUsername: '', smtpPassword: '' },
    security: { twoFactorAuth: false, ipRestriction: false, minPasswordLength: 8, sessionDuration: 30 },
    social: { instagram: '', telegram: '', whatsapp: '', twitter: '' },
    database: { server: '', port: '', name: '', username: '', password: '', type: 'postgresql', autoBackup: false },
    advanced: { debugMode: false, cacheEnabled: true, apiRateLimit: true, cacheDuration: 60, maxUploadSize: 10, errorLevel: 'error', logPath: '', apiKey: '', cacheStorage: 'memory', rateLimit: 100 },
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getSystemSettings();
        if (result.success && result.data) {
          const data = result.data;
          setFormData((prev) => ({
            ...prev,
            general: { ...prev.general, siteTitle: data.siteName || '', siteDescription: data.siteDescription || '', logoUrl: data.logoUrl || '' },
            email: { ...prev.email, smtpServer: data.smtpServer || '', smtpPort: data.smtpPort || '', smtpUsername: data.smtpUsername || '', smtpPassword: data.smtpPassword || '' },
            social: { ...prev.social, instagram: data.instagram || '', telegram: data.telegram || '', twitter: data.twitter || '', whatsapp: data.whatsapp || '' },
            advanced: { ...prev.advanced, cacheEnabled: data.cacheEnabled ?? true },
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleInputChange = useCallback((tab: keyof SettingsFormData, field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: value } }));
  }, []);

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      const result = await updateGeneralSettings({ siteName: formData.general.siteTitle, siteDescription: formData.general.siteDescription, logoUrl: formData.general.logoUrl });
      if (result.success) {
        toast({ title: 'موفق', description: 'تنظیمات عمومی با موفقیت ذخیره شد' });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در ذخیره تنظیمات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('files', file);
      uploadData.append('folder', 'general');
      const response = await fetch('/api/upload', { method: 'POST', body: uploadData });
      const data = await response.json();
      if (data.success && data.files?.[0]?.url) {
        handleInputChange('general', 'logoUrl', data.files[0].url);
        toast({ title: 'موفق', description: 'لوگو با موفقیت آپلود شد' });
      } else {
        toast({ title: 'خطا', description: data.error || 'خطا در آپلود لوگو', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در آپلود لوگو', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    setLoading(true);
    try {
      const result = await updateEmailSettings(formData.email);
      if (result.success) {
        toast({ title: 'موفق', description: 'تنظیمات ایمیل با موفقیت ذخیره شد' });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در ذخیره تنظیمات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdvanced = async () => {
    setLoading(true);
    try {
      const result = await updateCacheSettings({ cacheEnabled: formData.advanced.cacheEnabled });
      if (result.success) {
        toast({ title: 'موفق', description: 'تنظیمات پیشرفته با موفقیت ذخیره شد' });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در ذخیره تنظیمات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestDatabase = async () => {
    setLoading(true);
    try {
      const result = await testDatabaseConnection();
      if (result.success) {
        toast({ title: 'موفق', description: result.message });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در تست اتصال', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setLoading(true);
    try {
      const result = await testSmtpConnection(formData.email);
      if (result.success) {
        toast({ title: 'موفق', description: result.message });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در تست اتصال', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      const result = await generateApiKey();
      if (result.success && result.data) {
        handleInputChange('advanced', 'apiKey', result.data.apiKey);
        toast({ title: 'موفق', description: 'کلید API جدید تولید شد' });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در تولید کلید', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="at-page flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <Loader2 className="size-6 animate-spin text-[color:var(--at-accent)]" />
      </div>
    );
  }

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تنظیمات' }]}
        eyebrow="سیستم"
        title="تنظیمات"
        description="تنظیمات سیستم، امنیت، ایمیل و شبکه‌های اجتماعی"
      />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Vertical Tabs (sidebar) — atelier */}
        <nav className="lg:w-64 shrink-0 lg:sticky lg:top-6 lg:self-start">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`at-form-tab ${isActive ? 'is-active' : ''}`}
                  style={{
                    minWidth: 'max-content',
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '10px 14px',
                  }}
                >
                  <IconComponent className="size-4 shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span style={{ fontSize: '13px' }}>{tab.name}</span>
                    <span
                      className="hidden lg:block text-[10px]"
                      style={{ color: isActive ? 'var(--at-fg-muted)' : 'var(--at-fg-subtle)', fontWeight: 400, marginTop: '1px' }}
                    >
                      {tab.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">

          {/* General Settings */}
          {activeTab === 'general' && (
            <CardSection title="تنظیمات عمومی سایت" description="اطلاعات اصلی و هویت سایت خود را تنظیم کنید">
              <div className="at-form-grid">
                <InputField label="عنوان سایت" value={formData.general.siteTitle} onChange={(v) => handleInputChange('general', 'siteTitle', v)} placeholder="عنوان سایت را وارد کنید" disabled={loading} />
                <InputField label="توضیحات سایت" value={formData.general.siteDescription} onChange={(v) => handleInputChange('general', 'siteDescription', v)} placeholder="توضیحات سایت را وارد کنید" disabled={loading} />
                <InputField label="ایمیل تماس" type="email" value={formData.general.contactEmail} onChange={(v) => handleInputChange('general', 'contactEmail', v)} placeholder="ایمیل تماس را وارد کنید" disabled={loading} />
                <div className="space-y-2 sm:col-span-2">
                  <label className="at-field__label block">لوگوی سایت</label>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-[var(--at-radius)] border border-dashed border-[color:var(--at-line-strong)] bg-[color:var(--at-bg-deep)]">
                    {formData.general.logoUrl ? (
                      <div className="relative shrink-0">
                        <img src={formData.general.logoUrl} alt="Site logo preview" className="h-16 w-auto object-contain rounded-lg" />
                        <button
                          type="button"
                          onClick={() => handleInputChange('general', 'logoUrl', '')}
                          disabled={loading}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[color:var(--at-danger)] text-white text-xs flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                          aria-label="حذف لوگو"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)] flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-[color:var(--at-fg-subtle)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-3 w-full">
                      <InputField label="" value={formData.general.logoUrl} onChange={(v) => handleInputChange('general', 'logoUrl', v)} placeholder="https://example.com/logo.png" disabled={loading} />
                      <div className="flex items-center gap-3">
                        <label className={`at-btn ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <Upload className="size-4" />
                          <span>آپلود لوگو</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={loading} className="hidden" />
                        </label>
                        <span className="text-xs text-[color:var(--at-fg-subtle)]">یا URL لوگو را وارد کنید</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <ActionButtons loading={loading} onSubmit={handleSaveGeneral} />
            </CardSection>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <CardSection title="تنظیمات SMTP" description="سرور ایمیل خود را برای ارسال پیام‌ها پیکربندی کنید">
              <div className="at-form-grid">
                <InputField label="سرور SMTP" value={formData.email.smtpServer} onChange={(v) => handleInputChange('email', 'smtpServer', v)} placeholder="smtp.example.com" disabled={loading} />
                <InputField label="پورت" value={formData.email.smtpPort} onChange={(v) => handleInputChange('email', 'smtpPort', v)} placeholder="587" disabled={loading} />
                <InputField label="نام کاربری" value={formData.email.smtpUsername} onChange={(v) => handleInputChange('email', 'smtpUsername', v)} placeholder="username@example.com" disabled={loading} />
                <InputField label="رمز عبور" type="password" value={formData.email.smtpPassword} onChange={(v) => handleInputChange('email', 'smtpPassword', v)} placeholder="••••••••" disabled={loading} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={handleTestSmtp} disabled={loading} className="at-btn">
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                  تست اتصال
                </button>
                <button type="button" onClick={handleSaveEmail} disabled={loading} className="at-btn at-btn--primary">
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  ذخیره تنظیمات
                </button>
              </div>
            </CardSection>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <CardSection title="تنظیمات امنیتی" description="امنیت سیستم و دسترسی‌های کاربران را مدیریت کنید">
              <div className="space-y-3">
                <SettingToggleRow title="احراز هویت دو مرحله‌ای" description="فعال‌سازی احراز هویت دو مرحله‌ای برای افزایش امنیت" enabled={formData.security.twoFactorAuth} onChange={() => handleInputChange('security', 'twoFactorAuth', !formData.security.twoFactorAuth)} disabled={loading} />
                <SettingToggleRow title="محدودیت IP" description="محدود کردن دسترسی به IP‌های مشخص" enabled={formData.security.ipRestriction} onChange={() => handleInputChange('security', 'ipRestriction', !formData.security.ipRestriction)} disabled={loading} />
              </div>
              <div className="at-form-grid">
                <SelectField label="حداقل طول رمز عبور" value={formData.security.minPasswordLength} onChange={(v) => handleInputChange('security', 'minPasswordLength', parseInt(v))} disabled={loading} options={[{ value: 6, label: '۶ کاراکتر' }, { value: 8, label: '۸ کاراکتر' }, { value: 10, label: '۱۰ کاراکتر' }, { value: 12, label: '۱۲ کاراکتر' }]} />
                <SelectField label="مدت زمان نشست کاربری" value={formData.security.sessionDuration} onChange={(v) => handleInputChange('security', 'sessionDuration', parseInt(v))} disabled={loading} options={[{ value: 30, label: '۳۰ دقیقه' }, { value: 60, label: '۱ ساعت' }, { value: 120, label: '۲ ساعت' }, { value: 240, label: '۴ ساعت' }]} />
              </div>
              <ActionButtons loading={loading} onSubmit={() => toast({ title: 'اطلاع', description: 'تنظیمات امنیتی در نسخه بعدی فعال می‌شود' })} />
            </CardSection>
          )}

          {/* Social Settings */}
          {activeTab === 'social' && (
            <CardSection title="شبکه‌های اجتماعی" description="مدیریت لینک‌های شبکه‌های اجتماعی سایت">
              <SocialLinksManager />
            </CardSection>
          )}

          {/* Database Settings */}
          {activeTab === 'database' && (
            <CardSection title="تنظیمات پایگاه داده" description="اتصال و پیکربندی پایگاه داده را مدیریت کنید">
              <div className="at-form-grid">
                <InputField label="آدرس سرور" value={formData.database.server} onChange={(v) => handleInputChange('database', 'server', v)} placeholder="localhost" disabled={loading} />
                <InputField label="پورت" value={formData.database.port} onChange={(v) => handleInputChange('database', 'port', v)} placeholder="5432" disabled={loading} />
                <InputField label="نام پایگاه داده" value={formData.database.name} onChange={(v) => handleInputChange('database', 'name', v)} placeholder="biotak_db" disabled={loading} />
                <InputField label="نام کاربری" value={formData.database.username} onChange={(v) => handleInputChange('database', 'username', v)} placeholder="postgres" disabled={loading} />
                <InputField label="رمز عبور" type="password" value={formData.database.password} onChange={(v) => handleInputChange('database', 'password', v)} placeholder="••••••••" disabled={loading} />
                <SelectField label="نوع پایگاه داده" value={formData.database.type} onChange={(v) => handleInputChange('database', 'type', v)} disabled={loading} options={[{ value: 'postgresql', label: 'PostgreSQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'mongodb', label: 'MongoDB' }]} />
              </div>
              <div>
                <SettingToggleRow title="پشتیبان‌گیری خودکار" description="فعال‌سازی پشتیبان‌گیری خودکار از پایگاه داده" enabled={formData.database.autoBackup} onChange={() => handleInputChange('database', 'autoBackup', !formData.database.autoBackup)} disabled={loading} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={handleTestDatabase} disabled={loading} className="at-btn">
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
                  تست اتصال
                </button>
                <button type="button" onClick={() => toast({ title: 'اطلاع', description: 'تنظیمات دیتابیس از فایل .env خوانده می‌شود' })} disabled={loading} className="at-btn at-btn--primary">
                  <Check className="size-3.5" />
                  ذخیره تنظیمات
                </button>
              </div>
            </CardSection>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <CardSection title="تنظیمات پیشرفته" description="تنظیمات حرفه‌ای و پیشرفته سیستم">
              <div className="space-y-3">
                <SettingToggleRow title="حالت دیباگ" description="فعال‌سازی گزارش‌های خطا و اشکال‌زدایی" enabled={formData.advanced.debugMode} onChange={() => handleInputChange('advanced', 'debugMode', !formData.advanced.debugMode)} disabled={loading} />
                <SettingToggleRow title="ذخیره‌سازی کش" description="فعال‌سازی سیستم کش برای بهبود عملکرد" enabled={formData.advanced.cacheEnabled} onChange={() => handleInputChange('advanced', 'cacheEnabled', !formData.advanced.cacheEnabled)} disabled={loading} />
                <SettingToggleRow title="محدودیت درخواست API" description="محدودیت تعداد درخواست‌های API" enabled={formData.advanced.apiRateLimit} onChange={() => handleInputChange('advanced', 'apiRateLimit', !formData.advanced.apiRateLimit)} disabled={loading} />
              </div>
              <div className="at-form-grid">
                <InputField label="مدت زمان کش (دقیقه)" type="number" value={formData.advanced.cacheDuration} onChange={(v) => handleInputChange('advanced', 'cacheDuration', parseInt(v) || 60)} placeholder="60" disabled={loading} />
                <SelectField label="محدودیت درخواست API (در دقیقه)" value={formData.advanced.rateLimit} onChange={(v) => handleInputChange('advanced', 'rateLimit', parseInt(v))} disabled={loading} options={[{ value: 100, label: '۱۰۰ درخواست' }, { value: 500, label: '۵۰۰ درخواست' }, { value: 1000, label: '۱۰۰۰ درخواست' }]} />
                <InputField label="حداکثر اندازه فایل آپلود (MB)" type="number" value={formData.advanced.maxUploadSize} onChange={(v) => handleInputChange('advanced', 'maxUploadSize', parseInt(v) || 10)} placeholder="10" disabled={loading} />
                <SelectField label="سطح گزارش خطا" value={formData.advanced.errorLevel} onChange={(v) => handleInputChange('advanced', 'errorLevel', v)} disabled={loading} options={[{ value: 'error', label: 'خطا' }, { value: 'warning', label: 'هشدار' }, { value: 'info', label: 'اطلاعات' }, { value: 'debug', label: 'دیباگ' }]} />
              </div>
              <div className="space-y-3">
                <InputField label="مسیر ذخیره‌سازی لاگ‌ها" value={formData.advanced.logPath} onChange={(v) => handleInputChange('advanced', 'logPath', v)} placeholder="/var/log/biotak" disabled={loading} />
                <div className="space-y-2">
                  <label className="at-field__label block">کلید API</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.advanced.apiKey}
                      readOnly
                      placeholder="کلید API تولید نشده است"
                      className="at-input flex-1"
                      style={{ background: 'var(--at-bg-deep)', fontFamily: 'ui-monospace, monospace', fontSize: '12px', cursor: 'not-allowed' }}
                    />
                    <button type="button" onClick={handleGenerateApiKey} disabled={loading} className="at-btn at-btn--primary shrink-0">
                      {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'تولید کلید جدید'}
                    </button>
                  </div>
                </div>
                <SelectField label="ذخیره‌سازی کش" value={formData.advanced.cacheStorage} onChange={(v) => handleInputChange('advanced', 'cacheStorage', v)} disabled={loading} options={[{ value: 'memory', label: 'حافظه موقت' }, { value: 'redis', label: 'Redis کش' }, { value: 'file', label: 'فایل سیستم' }]} />
              </div>
              <ActionButtons loading={loading} onSubmit={handleSaveAdvanced} />
            </CardSection>
          )}
        </div>
      </div>
    </div>
  );
}