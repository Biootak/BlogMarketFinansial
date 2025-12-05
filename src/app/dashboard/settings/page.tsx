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
  general: { siteTitle: string; siteDescription: string; contactEmail: string };
  email: { smtpServer: string; smtpPort: string; smtpUsername: string; smtpPassword: string };
  security: { twoFactorAuth: boolean; ipRestriction: boolean; minPasswordLength: number; sessionDuration: number };
  social: { instagram: string; telegram: string; whatsapp: string; twitter: string };
  database: { server: string; port: string; name: string; username: string; password: string; type: string; autoBackup: boolean };
  advanced: { debugMode: boolean; cacheEnabled: boolean; apiRateLimit: boolean; cacheDuration: number; maxUploadSize: number; errorLevel: string; logPath: string; apiKey: string; cacheStorage: string; rateLimit: number };
}

// Toggle Switch Component - Ultra Premium Design
const ToggleSwitch = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--c-primary-300))]/40 focus-visible:ring-offset-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${enabled ? 'bg-gradient-to-r from-[rgb(var(--c-primary-500))] via-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-[0_4px_16px_rgba(var(--c-primary-500),0.4),0_0_0_1px_rgba(var(--c-primary-400),0.3)] bg-[length:200%_100%] hover:bg-[position:100%_0]' : 'bg-gradient-to-r from-gray-200 to-gray-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:from-gray-700 dark:to-gray-600'}`}
  >
    <span className={`pointer-events-none relative inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] ring-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${enabled ? '-translate-x-7 rotate-180' : '-translate-x-1'}`}>
      <span className={`absolute inset-0 rounded-full transition-all duration-300 ${enabled ? 'bg-gradient-to-br from-[rgb(var(--c-primary-100))] to-transparent opacity-50' : 'opacity-0'}`} />
    </span>
  </button>
);

// Input Field Component - Premium Glass Design
const InputField = ({ label, type = 'text', value, onChange, placeholder, readOnly = false, disabled = false }: { label: string; type?: string; value: string | number; onChange: (value: string) => void; placeholder?: string; readOnly?: boolean; disabled?: boolean }) => (
  <div className="group space-y-2.5">
    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 transition-colors duration-200 group-focus-within:text-[rgb(var(--c-primary-600))] dark:group-focus-within:text-[rgb(var(--c-primary-400))]">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-2xl border-2 bg-white/60 backdrop-blur-md px-5 py-3.5 text-sm font-medium text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-gray-400 placeholder:font-normal dark:bg-gray-800/60 dark:text-white ${readOnly || disabled ? 'cursor-not-allowed opacity-50 border-gray-200 dark:border-gray-700' : 'border-gray-200/80 hover:border-[rgb(var(--c-primary-300))]/60 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] hover:bg-white/80 focus:border-[rgb(var(--c-primary-500))] focus:bg-white focus:shadow-[0_8px_24px_rgba(var(--c-primary-500),0.12),0_4px_8px_rgba(0,0,0,0.08),0_0_0_4px_rgba(var(--c-primary-500),0.08)] focus:outline-none dark:border-gray-700/80 dark:hover:border-[rgb(var(--c-primary-400))]/40 dark:focus:border-[rgb(var(--c-primary-400))]'}`}
      />
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgb(var(--c-primary-500))]/0 via-[rgb(var(--c-primary-400))]/5 to-[rgb(var(--c-primary-500))]/0 opacity-0 transition-opacity duration-300 pointer-events-none ${!readOnly && !disabled ? 'group-focus-within:opacity-100' : ''}`} />
    </div>
  </div>
);

// Select Field Component - Premium Glass Design with RTL Support
const SelectField = ({ label, value, onChange, options, disabled = false }: { label: string; value: string | number; onChange: (value: string) => void; options: { value: string | number; label: string }[]; disabled?: boolean }) => (
  <div className="group space-y-2.5">
    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 transition-colors duration-200 group-focus-within:text-[rgb(var(--c-primary-600))] dark:group-focus-within:text-[rgb(var(--c-primary-400))]">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none rounded-2xl border-2 bg-white/60 backdrop-blur-md px-5 py-3.5 pl-12 text-sm font-medium text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] dark:bg-gray-800/60 dark:text-white ${disabled ? 'cursor-not-allowed opacity-50 border-gray-200 dark:border-gray-700' : 'cursor-pointer border-gray-200/80 hover:border-[rgb(var(--c-primary-300))]/60 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] hover:bg-white/80 focus:border-[rgb(var(--c-primary-500))] focus:bg-white focus:shadow-[0_8px_24px_rgba(var(--c-primary-500),0.12),0_4px_8px_rgba(0,0,0,0.08),0_0_0_4px_rgba(var(--c-primary-500),0.08)] focus:outline-none dark:border-gray-700/80 dark:hover:border-[rgb(var(--c-primary-400))]/40 dark:focus:border-[rgb(var(--c-primary-400))]'}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <svg className="h-5 w-5 text-gray-400 transition-transform duration-300 group-focus-within:rotate-180 group-focus-within:text-[rgb(var(--c-primary-500))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// Setting Toggle Row Component - Ultra Premium Card - Mobile Optimized
const SettingToggleRow = ({ title, description, enabled, onChange, disabled }: { title: string; description: string; enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-l from-white via-gray-50/50 to-white p-4 sm:p-5 lg:p-6 border border-gray-100/80 sm:border-2 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-[rgb(var(--c-primary-200))]/60 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06),0_3px_8px_rgba(0,0,0,0.04)] sm:hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/80 dark:border-gray-700/80 dark:hover:border-[rgb(var(--c-primary-400))]/40">
    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))]/0 via-[rgb(var(--c-primary-50))]/20 to-[rgb(var(--c-primary-50))]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
    <div className="relative flex items-center justify-between gap-4 sm:gap-5 lg:gap-6">
      <div className="flex-1 space-y-1 sm:space-y-1.5">
        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white transition-colors duration-200 group-hover:text-[rgb(var(--c-primary-700))] dark:group-hover:text-[rgb(var(--c-primary-300))]">{title}</h4>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  </div>
);

// Card Section Component - Ultra Premium Glass Morphism - Mobile Optimized
const CardSection = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-[2rem] bg-white/80 backdrop-blur-2xl border border-gray-200/60 sm:border-2 shadow-[0_4px_16px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)] sm:shadow-[0_8px_32px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04),0_0_0_1px_rgba(255,255,255,0.8)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08),0_6px_16px_rgba(0,0,0,0.06)] sm:hover:shadow-[0_20px_60px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] hover:border-[rgb(var(--c-primary-200))]/40 dark:bg-gray-900/80 dark:border-gray-700/60 dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] sm:dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:hover:border-[rgb(var(--c-primary-400))]/30">
    {/* Animated gradient background */}
    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))]/40 via-transparent to-[rgb(var(--c-primary-100))]/20 opacity-60 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
    
    {/* Floating orbs - Hidden on mobile for performance */}
    <div className="hidden sm:block absolute -right-24 -top-24 h-48 w-48 rounded-full bg-gradient-to-br from-[rgb(var(--c-primary-300))]/30 to-[rgb(var(--c-primary-500))]/20 blur-3xl transition-transform duration-700 group-hover:scale-125 group-hover:rotate-45" />
    <div className="hidden sm:block absolute -left-32 -bottom-32 h-56 w-56 rounded-full bg-gradient-to-tr from-[rgb(var(--c-primary-200))]/20 to-[rgb(var(--c-primary-400))]/10 blur-3xl transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-45" />
    
    <div className="relative p-5 sm:p-7 lg:p-10">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8 lg:mb-10 pb-5 sm:pb-6 lg:pb-8 border-b border-gray-200/60 sm:border-b-2 dark:border-gray-700/60">
        <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 mb-2 sm:mb-3">
          <div className="relative flex items-center justify-center mt-1">
            <div className="absolute h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[rgb(var(--c-primary-500))] animate-ping opacity-75" />
            <div className="relative h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[rgb(var(--c-primary-600))] shadow-[0_0_8px_rgba(var(--c-primary-500),0.5)] sm:shadow-[0_0_12px_rgba(var(--c-primary-500),0.6)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white mb-1 sm:mb-2">{title}</h3>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{description}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-5 sm:space-y-6 lg:space-y-7">{children}</div>
    </div>
  </div>
);

// Action Buttons Component - Premium Design - Mobile Optimized
const ActionButtons = ({ onReset, onSubmit, loading, disabled }: { onReset?: () => void; onSubmit?: () => void; loading?: boolean; disabled?: boolean }) => (
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-6 sm:pt-8 lg:pt-10 mt-6 sm:mt-8 lg:mt-10 border-t border-gray-200/60 sm:border-t-2 dark:border-gray-700/60">
    <button 
      type="button" 
      onClick={onReset} 
      disabled={loading || disabled} 
      className="group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-bold text-gray-700 bg-white border border-gray-200/80 sm:border-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-gray-300 hover:text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 active:translate-y-0 active:scale-95 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <RefreshCw className={`relative h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover:-rotate-180'}`} />
      <span className="relative">بازنشانی</span>
    </button>
    
    <button 
      type="button" 
      onClick={onSubmit} 
      disabled={loading || disabled} 
      className="group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-6 py-3 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-black text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] bg-[length:200%_100%] shadow-[0_4px_16px_rgba(var(--c-primary-500),0.4),0_2px_8px_rgba(0,0,0,0.1),0_0_0_1px_rgba(var(--c-primary-400),0.3)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[position:100%_0] hover:shadow-[0_8px_32px_rgba(var(--c-primary-500),0.5),0_4px_16px_rgba(0,0,0,0.15)] hover:-translate-y-1 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 active:translate-y-0 active:scale-100"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      {loading ? (
        <Loader2 className="relative h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <Check className="relative h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
      )}
      <span className="relative">{loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
    </button>
  </div>
);

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formData, setFormData] = useState<SettingsFormData>({
    general: { siteTitle: '', siteDescription: '', contactEmail: '' },
    email: { smtpServer: '', smtpPort: '', smtpUsername: '', smtpPassword: '' },
    security: { twoFactorAuth: false, ipRestriction: false, minPasswordLength: 8, sessionDuration: 30 },
    social: { instagram: '', telegram: '', whatsapp: '', twitter: '' },
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

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="relative">
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full border-4 border-[rgb(var(--c-primary-200))]/30 animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-[rgb(var(--c-primary-300))]/40 animate-pulse" />
          </div>
          {/* Center spinner */}
          <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-white shadow-[0_8px_32px_rgba(var(--c-primary-500),0.2)] dark:bg-gray-800">
            <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--c-primary-600))]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rtl py-4 sm:py-6 lg:py-10 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" style={{ direction: 'rtl' }}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-[1600px]">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-10">
          {/* Hero Header - Ultra Premium Design - Mobile Optimized */}
          <header className="group relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-gradient-to-bl from-[rgb(var(--c-primary-700))] via-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] shadow-[0_12px_32px_rgba(var(--c-primary-600),0.3),0_4px_12px_rgba(0,0,0,0.15)] sm:shadow-[0_20px_60px_rgba(var(--c-primary-600),0.4),0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-500 hover:shadow-[0_24px_80px_rgba(var(--c-primary-600),0.5),0_12px_32px_rgba(0,0,0,0.25)]">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-60" />
            
            {/* Floating animated orbs - Hidden on mobile for performance */}
            <div className="hidden sm:block absolute -left-40 -top-40 h-80 w-80 rounded-full bg-white/15 blur-3xl transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-45" />
            <div className="hidden sm:block absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-[rgb(var(--c-primary-400))]/20 blur-3xl transition-transform duration-1000 group-hover:scale-110 group-hover:-rotate-45" />
            
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="relative p-5 sm:p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 lg:gap-8">
                <div className="flex-1 space-y-3 sm:space-y-4 lg:space-y-5">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white border border-white/30 sm:border-2 shadow-[0_2px_8px_rgba(0,0,0,0.1)] sm:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 hover:bg-white/25 hover:scale-105">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
                    <span>تنظیمات سیستم</span>
                  </div>
                  
                  {/* Title */}
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] sm:drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                    پیکربندی و مدیریت
                  </h1>
                  
                  {/* Description */}
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-white/90 max-w-2xl leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.15)] sm:drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                    تمامی تنظیمات سیستم، ایمیل، امنیت و شبکه‌های اجتماعی را از اینجا مدیریت کنید
                  </p>
                </div>
                
                {/* Stats Card - Hidden on small mobile */}
                <div className="hidden xs:flex gap-3 sm:gap-4 lg:gap-5">
                  <div className="group/stat relative overflow-hidden flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl bg-white/15 backdrop-blur-xl px-5 py-4 sm:px-7 sm:py-5 lg:px-8 lg:py-6 border border-white/25 sm:border-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)] sm:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover/stat:opacity-100" />
                    <span className="relative text-3xl sm:text-4xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]">۶</span>
                    <span className="relative text-xs sm:text-sm text-white/80 font-bold mt-0.5 sm:mt-1">بخش تنظیمات</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-7">
            {/* Mobile Custom Dropdown Navigation - Premium RTL Design */}
            <div className="lg:hidden relative">
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between rounded-xl bg-white/80 backdrop-blur-2xl border-2 border-gray-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)] py-3.5 px-4 text-sm font-bold text-gray-900 transition-all duration-300 hover:border-[rgb(var(--c-primary-300))]/60 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] dark:bg-gray-900/80 dark:border-gray-700/60 dark:text-white dark:hover:border-[rgb(var(--c-primary-400))]/40"
              >
                {/* Selected Tab Display */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const activeTabData = tabs.find(t => t.id === activeTab);
                    const IconComponent = activeTabData?.icon || Settings;
                    return (
                      <>
                        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] shadow-[0_4px_12px_rgba(var(--c-primary-500),0.3)]">
                          <IconComponent className="h-4.5 w-4.5 text-white" />
                        </div>
                        <span>{activeTabData?.name}</span>
                      </>
                    );
                  })()}
                </div>
                
                {/* Arrow Icon */}
                <svg 
                  className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setDropdownOpen(false)}
                  />
                  
                  {/* Menu Items */}
                  <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-xl bg-white/95 backdrop-blur-2xl border-2 border-gray-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden dark:bg-gray-900/95 dark:border-gray-700/60">
                    <div className="py-2">
                      {tabs.map((tab) => {
                        const IconComponent = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-200 ${
                              isActive 
                                ? 'bg-gradient-to-l from-[rgb(var(--c-primary-500))]/10 to-[rgb(var(--c-primary-600))]/5 text-[rgb(var(--c-primary-700))] dark:text-[rgb(var(--c-primary-400))]' 
                                : 'text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/60'
                            }`}
                          >
                            <div className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? 'bg-gradient-to-br from-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] shadow-lg' 
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                            </div>
                            <div className="flex-1 text-right">
                              <div>{tab.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">{tab.description}</div>
                            </div>
                            {isActive && (
                              <Check className="h-5 w-5 text-[rgb(var(--c-primary-600))] dark:text-[rgb(var(--c-primary-400))]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Desktop Sidebar Navigation */}
            <nav className="hidden lg:block lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-[1.75rem] bg-white/80 backdrop-blur-2xl border-2 border-gray-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-4 dark:bg-gray-900/80 dark:border-gray-700/60">
                <div className="flex flex-col gap-2">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`group relative overflow-hidden flex items-center gap-4 rounded-2xl px-5 py-4 w-full text-sm font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isActive ? 'bg-gradient-to-l from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] bg-[length:200%_100%] text-white shadow-[0_8px_24px_rgba(var(--c-primary-500),0.4),0_4px_12px_rgba(0,0,0,0.1)] scale-[1.02]' : 'text-gray-700 hover:bg-gradient-to-l hover:from-gray-100/80 hover:to-gray-50/80 hover:text-gray-900 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:scale-[1.01] active:scale-[0.98] dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200'}`}
                      >
                        {/* Active indicator line */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-full bg-white/60 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
                        )}
                        
                        {/* Shine effect on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] transition-transform duration-700 ${isActive ? 'group-hover:translate-x-[100%]' : ''}`} />
                        
                        {/* Icon with background */}
                        <div className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]' : 'bg-gray-100/80 group-hover:bg-white dark:bg-gray-800/80 dark:group-hover:bg-gray-700/80'}`}>
                          <IconComponent className={`h-5 w-5 shrink-0 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-600 group-hover:text-[rgb(var(--c-primary-600))] group-hover:scale-110 dark:text-gray-400'}`} />
                        </div>
                        
                        {/* Text content */}
                        <div className="relative flex flex-col items-start flex-1">
                          <span className="text-base leading-tight">{tab.name}</span>
                          <span className={`text-xs mt-0.5 leading-tight transition-colors duration-200 ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-500'}`}>
                            {tab.description}
                          </span>
                        </div>
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-6 sm:pt-8 lg:pt-10 mt-6 sm:mt-8 lg:mt-10 border-t border-gray-200/60 sm:border-t-2 dark:border-gray-700/60">
                    <button 
                      type="button" 
                      onClick={handleTestSmtp} 
                      disabled={loading} 
                      className="group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-bold text-gray-700 bg-white border border-gray-200/80 sm:border-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      {loading ? <Loader2 className="relative h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Mail className="relative h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:scale-110" />}
                      <span className="relative">تست اتصال</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSaveEmail} 
                      disabled={loading} 
                      className="group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-6 py-3 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-black text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] bg-[length:200%_100%] shadow-[0_4px_16px_rgba(var(--c-primary-500),0.4),0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-[0_8px_32px_rgba(var(--c-primary-500),0.5)] hover:-translate-y-1 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed active:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      {loading ? <Loader2 className="relative h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Check className="relative h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-125" />}
                      <span className="relative">ذخیره تنظیمات</span>
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
                <CardSection title="شبکه‌های اجتماعی" description="مدیریت لینک‌های شبکه‌های اجتماعی سایت">
                  <SocialLinksManager />
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-6 sm:pt-8 lg:pt-10 mt-6 sm:mt-8 lg:mt-10 border-t border-gray-200/60 sm:border-t-2 dark:border-gray-700/60">
                    <button 
                      type="button" 
                      onClick={handleTestDatabase} 
                      disabled={loading} 
                      className="group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-bold text-gray-700 bg-white border border-gray-200/80 sm:border-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      {loading ? <Loader2 className="relative h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Database className="relative h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:scale-110" />}
                      <span className="relative">تست اتصال</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => toast({ title: 'اطلاع', description: 'تنظیمات دیتابیس از فایل .env خوانده می‌شود' })} 
                      disabled={loading} 
                      className="group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-6 py-3 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-black text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] bg-[length:200%_100%] shadow-[0_4px_16px_rgba(var(--c-primary-500),0.4),0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-[0_8px_32px_rgba(var(--c-primary-500),0.5)] hover:-translate-y-1 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed active:scale-100"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <Check className="relative h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-125" />
                      <span className="relative">ذخیره تنظیمات</span>
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
                    <div className="group space-y-2 sm:space-y-2.5">
                      <label className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">کلید API</label>
                      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                        <input 
                          type="text" 
                          value={formData.advanced.apiKey} 
                          readOnly 
                          placeholder="کلید API تولید نشده است" 
                          className="flex-1 rounded-xl sm:rounded-2xl border border-gray-200/80 sm:border-2 bg-gray-50/80 backdrop-blur-sm px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm text-gray-900 font-mono cursor-not-allowed opacity-60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-gray-800/80 dark:text-white" 
                        />
                        <button 
                          type="button" 
                          onClick={handleGenerateApiKey} 
                          disabled={loading} 
                          className="group/btn relative overflow-hidden shrink-0 rounded-xl sm:rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-black text-white bg-gradient-to-l from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] bg-[length:200%_100%] shadow-[0_4px_16px_rgba(var(--c-primary-500),0.4)] transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-[0_8px_32px_rgba(var(--c-primary-500),0.5)] hover:-translate-y-0.5 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed active:scale-100"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                          <span className="relative flex items-center gap-1.5 sm:gap-2">
                            {loading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            <span className="whitespace-nowrap">تولید کلید جدید</span>
                          </span>
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
