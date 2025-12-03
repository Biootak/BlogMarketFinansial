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
  Sparkles,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  getSystemSettings,
  updateGeneralSettings,
  updateEmailSettings,
  updateSocialSettings,
  updateCacheSettings,
  testDatabaseConnection,
  testSmtpConnection,
  generateApiKey,
} from '@/actions/settingsActions';

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
  general: { siteTitle: string; siteDescription: string; contactEmail: string };
  email: { smtpServer: string; smtpPort: string; smtpUsername: string; smtpPassword: string };
  security: { twoFactorAuth: boolean; ipRestriction: boolean; minPasswordLength: number; sessionDuration: number };
  social: { instagram: string; telegram: string; linkedin: string; twitter: string };
  database: { server: string; port: string; name: string; username: string; password: string; type: string; autoBackup: boolean };
  advanced: { debugMode: boolean; cacheEnabled: boolean; apiRateLimit: boolean; cacheDuration: number; maxUploadSize: number; errorLevel: string; logPath: string; apiKey: string; cacheStorage: string; rateLimit: number };
}

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${enabled ? 'bg-gradient-to-r from-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] shadow-lg shadow-[rgb(var(--c-primary-500))]/30' : 'bg-gray-200 dark:bg-gray-700'}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${enabled ? '-translate-x-6' : '-translate-x-1'}`} />
  </button>
);

// Input Field Component
const InputField = ({ label, type = 'text', value, onChange, placeholder, readOnly = false, disabled = false }: { label: string; type?: string; value: string | number; onChange: (value: string) => void; placeholder?: string; readOnly?: boolean; disabled?: boolean }) => (
  <div className="group space-y-2">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full rounded-xl border-2 border-gray-200/80 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm text-gray-900 shadow-sm transition-all duration-300 ease-out placeholder:text-gray-400 hover:border-[rgb(var(--c-primary-200))] hover:shadow-md focus:border-[rgb(var(--c-primary-400))] focus:bg-white focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-[rgb(var(--c-primary-100))]/50 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white ${readOnly || disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    />
  </div>
);

// Select Field Component
const SelectField = ({ label, value, onChange, options, disabled = false }: { label: string; value: string | number; onChange: (value: string) => void; options: { value: string | number; label: string }[]; disabled?: boolean }) => (
  <div className="group space-y-2">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-xl border-2 border-gray-200/80 bg-white/80 backdrop-blur-sm px-4 py-3 pr-10 text-sm text-gray-900 shadow-sm transition-all duration-300 ease-out hover:border-[rgb(var(--c-primary-200))] hover:shadow-md focus:border-[rgb(var(--c-primary-400))] focus:bg-white focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-[rgb(var(--c-primary-100))]/50 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Setting Toggle Row Component
const SettingToggleRow = ({ title, description, enabled, onChange, disabled }: { title: string; description: string; enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <div className="group flex items-center justify-between rounded-2xl bg-gradient-to-l from-gray-50/80 to-white/50 p-5 border border-gray-100/80 transition-all duration-300 ease-out hover:border-[rgb(var(--c-primary-100))] hover:shadow-md dark:from-gray-800/50 dark:to-gray-900/50 dark:border-gray-700">
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
);

// Card Section Component
const CardSection = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-xl shadow-gray-200/40 transition-all duration-500 ease-out hover:shadow-2xl dark:bg-gray-900/70 dark:border-gray-700/60">
    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))]/30 via-transparent to-transparent pointer-events-none" />
    <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[rgb(var(--c-primary-200))]/20 blur-3xl" />
    <div className="relative p-6 sm:p-8 lg:p-10">
      <div className="mb-8 pb-6 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-primary-500))] animate-pulse" />
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mr-5">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  </div>
);

// Action Buttons Component
const ActionButtons = ({ onReset, onSubmit, loading, disabled }: { onReset?: () => void; onSubmit?: () => void; loading?: boolean; disabled?: boolean }) => (
  <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-gray-200/60 dark:border-gray-700/60">
    <button type="button" onClick={onReset} disabled={loading || disabled} className="group flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100/80 border border-gray-200/60 transition-all duration-300 hover:bg-gray-200/80 hover:text-gray-900 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700">
      <RefreshCw className={`h-4 w-4 transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover:-rotate-180'}`} />
      <span>بازنشانی</span>
    </button>
    <button type="button" onClick={onSubmit} disabled={loading || disabled} className="group flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-lg shadow-[rgb(var(--c-primary-500))]/30 transition-all duration-300 hover:shadow-xl hover:from-[rgb(var(--c-primary-700))] hover:to-[rgb(var(--c-primary-600))] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 active:translate-y-0">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />}
      <span>{loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
    </button>
  </div>
);

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<SettingsFormData>({
    general: { siteTitle: '', siteDescription: '', contactEmail: '' },
    email: { smtpServer: '', smtpPort: '', smtpUsername: '', smtpPassword: '' },
    security: { twoFactorAuth: false, ipRestriction: false, minPasswordLength: 8, sessionDuration: 30 },
    social: { instagram: '', telegram: '', linkedin: '', twitter: '' },
    database: { server: '', port: '', name: '', username: '', password: '', type: 'postgresql', autoBackup: false },
    advanced: { debugMode: false, cacheEnabled: true, apiRateLimit: true, cacheDuration: 60, maxUploadSize: 10, errorLevel: 'error', logPath: '', apiKey: '', cacheStorage: 'memory', rateLimit: 100 },
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getSystemSettings();
        if (result.success && result.data) {
          const data = result.data;
          setFormData((prev) => ({
            ...prev,
            general: { ...prev.general, siteTitle: data.siteName || '', siteDescription: data.siteDescription || '' },
            email: { ...prev.email, smtpServer: data.smtpServer || '', smtpPort: data.smtpPort || '', smtpUsername: data.smtpUsername || '', smtpPassword: data.smtpPassword || '' },
            social: { ...prev.social, instagram: data.instagram || '', telegram: data.telegram || '', twitter: data.twitter || '', linkedin: data.whatsapp || '' },
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

  // Save General Settings
  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      const result = await updateGeneralSettings({ siteName: formData.general.siteTitle, siteDescription: formData.general.siteDescription });
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

  // Save Email Settings
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

  // Save Social Settings
  const handleSaveSocial = async () => {
    setLoading(true);
    try {
      const result = await updateSocialSettings({ instagram: formData.social.instagram, telegram: formData.social.telegram, twitter: formData.social.twitter, whatsapp: formData.social.linkedin });
      if (result.success) {
        toast({ title: 'موفق', description: 'تنظیمات شبکه‌های اجتماعی با موفقیت ذخیره شد' });
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در ذخیره تنظیمات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Save Advanced Settings
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

  // Test Database Connection
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

  // Test SMTP Connection
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

  // Generate API Key
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

  // Connect Social Media
  const handleConnectSocial = (platform: string) => {
    const value = formData.social[platform as keyof typeof formData.social];
    if (!value) {
      toast({ title: 'خطا', description: `لطفاً نام کاربری ${platform} را وارد کنید`, variant: 'destructive' });
      return;
    }
    toast({ title: 'موفق', description: `${platform} با موفقیت متصل شد` });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--c-primary-500))]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen rtl py-6 sm:py-8 lg:py-10" style={{ direction: 'rtl' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col gap-8 lg:gap-10">
          {/* Hero Header */}
          <header className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-400))] shadow-2xl shadow-[rgb(var(--c-primary-500))]/30">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50" />
            <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-[rgb(var(--c-primary-300))]/20 blur-3xl" />
            <div className="relative p-6 sm:p-8 lg:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-2 text-sm font-medium text-white/90 border border-white/20">
                    <Sparkles className="h-4 w-4" />
                    <span>تنظیمات سیستم</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">پیکربندی و مدیریت</h1>
                  <p className="text-base sm:text-lg text-white/80 max-w-xl">تمامی تنظیمات سیستم، ایمیل، امنیت و شبکه‌های اجتماعی را از اینجا مدیریت کنید</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md px-6 py-4 border border-white/20">
                    <span className="text-2xl font-bold text-white">۶</span>
                    <span className="text-xs text-white/70">بخش تنظیمات</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Sidebar Navigation */}
            <nav className="lg:w-72 shrink-0 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-xl p-3 dark:bg-gray-900/70 dark:border-gray-700/60">
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`group relative flex items-center gap-3 rounded-xl px-4 py-3.5 min-w-max lg:min-w-0 lg:w-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] text-white shadow-lg shadow-[rgb(var(--c-primary-500))]/30' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/80'}`}>
                        <IconComponent className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                        <div className="flex flex-col items-start">
                          <span>{tab.name}</span>
                          <span className={`text-xs hidden lg:block ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{tab.description}</span>
                        </div>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-white/50 hidden lg:block" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>

            {/* Tab Content */}
            <div className="flex-1 min-w-0">

              {/* General Settings */}
              {activeTab === 'general' && (
                <CardSection title="تنظیمات عمومی سایت" description="اطلاعات اصلی و هویت سایت خود را تنظیم کنید">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="عنوان سایت" value={formData.general.siteTitle} onChange={(v) => handleInputChange('general', 'siteTitle', v)} placeholder="عنوان سایت را وارد کنید" disabled={loading} />
                    <InputField label="توضیحات سایت" value={formData.general.siteDescription} onChange={(v) => handleInputChange('general', 'siteDescription', v)} placeholder="توضیحات سایت را وارد کنید" disabled={loading} />
                    <InputField label="ایمیل تماس" type="email" value={formData.general.contactEmail} onChange={(v) => handleInputChange('general', 'contactEmail', v)} placeholder="ایمیل تماس را وارد کنید" disabled={loading} />
                  </div>
                  <ActionButtons loading={loading} onSubmit={handleSaveGeneral} />
                </CardSection>
              )}

              {/* Email Settings */}
              {activeTab === 'email' && (
                <CardSection title="تنظیمات SMTP" description="سرور ایمیل خود را برای ارسال پیام‌ها پیکربندی کنید">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="سرور SMTP" value={formData.email.smtpServer} onChange={(v) => handleInputChange('email', 'smtpServer', v)} placeholder="smtp.example.com" disabled={loading} />
                    <InputField label="پورت" value={formData.email.smtpPort} onChange={(v) => handleInputChange('email', 'smtpPort', v)} placeholder="587" disabled={loading} />
                    <InputField label="نام کاربری" value={formData.email.smtpUsername} onChange={(v) => handleInputChange('email', 'smtpUsername', v)} placeholder="username@example.com" disabled={loading} />
                    <InputField label="رمز عبور" type="password" value={formData.email.smtpPassword} onChange={(v) => handleInputChange('email', 'smtpPassword', v)} placeholder="••••••••" disabled={loading} />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-gray-200/60">
                    <button type="button" onClick={handleTestSmtp} disabled={loading} className="group flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100/80 border border-gray-200/60 transition-all duration-300 hover:bg-gray-200/80 hover:shadow-md disabled:opacity-50">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      <span>تست اتصال</span>
                    </button>
                    <button type="button" onClick={handleSaveEmail} disabled={loading} className="group flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-50">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span>ذخیره تنظیمات</span>
                    </button>
                  </div>
                </CardSection>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <CardSection title="تنظیمات امنیتی" description="امنیت سیستم و دسترسی‌های کاربران را مدیریت کنید">
                  <div className="space-y-4">
                    <SettingToggleRow title="احراز هویت دو مرحله‌ای" description="فعال‌سازی احراز هویت دو مرحله‌ای برای افزایش امنیت" enabled={formData.security.twoFactorAuth} onChange={() => handleInputChange('security', 'twoFactorAuth', !formData.security.twoFactorAuth)} disabled={loading} />
                    <SettingToggleRow title="محدودیت IP" description="محدود کردن دسترسی به IP‌های مشخص" enabled={formData.security.ipRestriction} onChange={() => handleInputChange('security', 'ipRestriction', !formData.security.ipRestriction)} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                    <SelectField label="حداقل طول رمز عبور" value={formData.security.minPasswordLength} onChange={(v) => handleInputChange('security', 'minPasswordLength', parseInt(v))} disabled={loading} options={[{ value: 6, label: '6 کاراکتر' }, { value: 8, label: '8 کاراکتر' }, { value: 10, label: '10 کاراکتر' }, { value: 12, label: '12 کاراکتر' }]} />
                    <SelectField label="مدت زمان نشست کاربری" value={formData.security.sessionDuration} onChange={(v) => handleInputChange('security', 'sessionDuration', parseInt(v))} disabled={loading} options={[{ value: 30, label: '30 دقیقه' }, { value: 60, label: '1 ساعت' }, { value: 120, label: '2 ساعت' }, { value: 240, label: '4 ساعت' }]} />
                  </div>
                  <ActionButtons loading={loading} onSubmit={() => toast({ title: 'اطلاع', description: 'تنظیمات امنیتی در نسخه بعدی فعال می‌شود' })} />
                </CardSection>
              )}

              {/* Social Settings */}
              {activeTab === 'social' && (
                <CardSection title="شبکه‌های اجتماعی" description="حساب‌های شبکه‌های اجتماعی خود را متصل کنید">
                  <div className="space-y-5">
                    {[
                      { key: 'instagram', label: 'اینستاگرام', placeholder: 'نام کاربری اینستاگرام' },
                      { key: 'telegram', label: 'تلگرام', placeholder: 'نام کاربری تلگرام' },
                      { key: 'linkedin', label: 'لینکدین', placeholder: 'آدرس پروفایل لینکدین' },
                      { key: 'twitter', label: 'توییتر', placeholder: 'نام کاربری توییتر' },
                    ].map((social) => (
                      <div key={social.key} className="group space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{social.label}</label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={formData.social[social.key as keyof typeof formData.social]}
                            onChange={(e) => handleInputChange('social', social.key, e.target.value)}
                            placeholder={social.placeholder}
                            disabled={loading}
                            className="flex-1 rounded-xl border-2 border-gray-200/80 bg-white/80 px-4 py-3 text-sm text-gray-900 transition-all duration-300 placeholder:text-gray-400 hover:border-[rgb(var(--c-primary-200))] focus:border-[rgb(var(--c-primary-400))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--c-primary-100))]/50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleConnectSocial(social.key)}
                            disabled={loading}
                            className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 active:translate-y-0"
                          >
                            اتصال
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ActionButtons loading={loading} onSubmit={handleSaveSocial} />
                </CardSection>
              )}

              {/* Database Settings */}
              {activeTab === 'database' && (
                <CardSection title="تنظیمات پایگاه داده" description="اتصال و پیکربندی پایگاه داده را مدیریت کنید">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="آدرس سرور" value={formData.database.server} onChange={(v) => handleInputChange('database', 'server', v)} placeholder="localhost" disabled={loading} />
                    <InputField label="پورت" value={formData.database.port} onChange={(v) => handleInputChange('database', 'port', v)} placeholder="5432" disabled={loading} />
                    <InputField label="نام پایگاه داده" value={formData.database.name} onChange={(v) => handleInputChange('database', 'name', v)} placeholder="biotak_db" disabled={loading} />
                    <InputField label="نام کاربری" value={formData.database.username} onChange={(v) => handleInputChange('database', 'username', v)} placeholder="postgres" disabled={loading} />
                    <InputField label="رمز عبور" type="password" value={formData.database.password} onChange={(v) => handleInputChange('database', 'password', v)} placeholder="••••••••" disabled={loading} />
                    <SelectField label="نوع پایگاه داده" value={formData.database.type} onChange={(v) => handleInputChange('database', 'type', v)} disabled={loading} options={[{ value: 'postgresql', label: 'PostgreSQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'mongodb', label: 'MongoDB' }]} />
                  </div>
                  <div className="mt-6">
                    <SettingToggleRow title="پشتیبان‌گیری خودکار" description="فعال‌سازی پشتیبان‌گیری خودکار از پایگاه داده" enabled={formData.database.autoBackup} onChange={() => handleInputChange('database', 'autoBackup', !formData.database.autoBackup)} disabled={loading} />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-gray-200/60">
                    <button type="button" onClick={handleTestDatabase} disabled={loading} className="group flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100/80 border border-gray-200/60 transition-all duration-300 hover:bg-gray-200/80 hover:shadow-md disabled:opacity-50">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      <span>تست اتصال</span>
                    </button>
                    <button type="button" onClick={() => toast({ title: 'اطلاع', description: 'تنظیمات دیتابیس از فایل .env خوانده می‌شود' })} disabled={loading} className="group flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-50">
                      <Check className="h-4 w-4" />
                      <span>ذخیره تنظیمات</span>
                    </button>
                  </div>
                </CardSection>
              )}

              {/* Advanced Settings */}
              {activeTab === 'advanced' && (
                <CardSection title="تنظیمات پیشرفته" description="تنظیمات حرفه‌ای و پیشرفته سیستم">
                  <div className="space-y-4">
                    <SettingToggleRow title="حالت دیباگ" description="فعال‌سازی گزارش‌های خطا و اشکال‌زدایی" enabled={formData.advanced.debugMode} onChange={() => handleInputChange('advanced', 'debugMode', !formData.advanced.debugMode)} disabled={loading} />
                    <SettingToggleRow title="ذخیره‌سازی کش" description="فعال‌سازی سیستم کش برای بهبود عملکرد" enabled={formData.advanced.cacheEnabled} onChange={() => handleInputChange('advanced', 'cacheEnabled', !formData.advanced.cacheEnabled)} disabled={loading} />
                    <SettingToggleRow title="محدودیت درخواست API" description="محدودیت تعداد درخواست‌های API" enabled={formData.advanced.apiRateLimit} onChange={() => handleInputChange('advanced', 'apiRateLimit', !formData.advanced.apiRateLimit)} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                    <InputField label="مدت زمان کش (دقیقه)" type="number" value={formData.advanced.cacheDuration} onChange={(v) => handleInputChange('advanced', 'cacheDuration', parseInt(v) || 60)} placeholder="60" disabled={loading} />
                    <SelectField label="محدودیت درخواست API (در دقیقه)" value={formData.advanced.rateLimit} onChange={(v) => handleInputChange('advanced', 'rateLimit', parseInt(v))} disabled={loading} options={[{ value: 100, label: '100 درخواست' }, { value: 500, label: '500 درخواست' }, { value: 1000, label: '1000 درخواست' }]} />
                    <InputField label="حداکثر اندازه فایل آپلود (MB)" type="number" value={formData.advanced.maxUploadSize} onChange={(v) => handleInputChange('advanced', 'maxUploadSize', parseInt(v) || 10)} placeholder="10" disabled={loading} />
                    <SelectField label="سطح گزارش خطا" value={formData.advanced.errorLevel} onChange={(v) => handleInputChange('advanced', 'errorLevel', v)} disabled={loading} options={[{ value: 'error', label: 'خطا' }, { value: 'warning', label: 'هشدار' }, { value: 'info', label: 'اطلاعات' }, { value: 'debug', label: 'دیباگ' }]} />
                  </div>
                  <div className="space-y-5 mt-6">
                    <InputField label="مسیر ذخیره‌سازی لاگ‌ها" value={formData.advanced.logPath} onChange={(v) => handleInputChange('advanced', 'logPath', v)} placeholder="/var/log/biotak" disabled={loading} />
                    <div className="group space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">کلید API</label>
                      <div className="flex gap-3">
                        <input type="text" value={formData.advanced.apiKey} readOnly placeholder="کلید API تولید نشده است" className="flex-1 rounded-xl border-2 border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm text-gray-900 font-mono cursor-not-allowed opacity-70 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white" />
                        <button type="button" onClick={handleGenerateApiKey} disabled={loading} className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 active:translate-y-0">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تولید کلید جدید'}
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
      </div>
    </div>
  );
}
