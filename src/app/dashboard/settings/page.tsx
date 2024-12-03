'use client';

import { useState } from 'react';
import { Settings, Mail, Shield, Share2, Database, Wrench, type LucideIcon } from 'lucide-react';

interface TabType {
  id: string;
  name: string;
  icon: LucideIcon;
}

const tabs: TabType[] = [
  { id: 'general', name: 'تنظیمات عمومی', icon: Settings },
  { id: 'email', name: 'تنظیمات ایمیل', icon: Mail },
  { id: 'security', name: 'تنظیمات امنیتی', icon: Shield },
  { id: 'social', name: 'شبکه‌های اجتماعی', icon: Share2 },
  { id: 'database', name: 'پایگاه داده', icon: Database },
  { id: 'advanced', name: 'تنظیمات پیشرفته', icon: Wrench },
];

interface SettingsFormData {
  general: {
    siteTitle: string;
    siteDescription: string;
    contactEmail: string;
  };
  email: {
    smtpServer: string;
    smtpPort: string;
    smtpUsername: string;
    smtpPassword: string;
  };
  security: {
    twoFactorAuth: boolean;
    ipRestriction: boolean;
    minPasswordLength: number;
    sessionDuration: number;
  };
  social: {
    instagram: string;
    telegram: string;
    linkedin: string;
    twitter: string;
  };
  database: {
    server: string;
    port: string;
    name: string;
    username: string;
    password: string;
    type: string;
    autoBackup: boolean;
    rtl: boolean;
  };
  advanced: {
    debugMode: boolean;
    cacheEnabled: boolean;
    apiRateLimit: boolean;
    cacheDuration: number;
    apiRequestLimit: number;
    maxUploadSize: number;
    errorLevel: string;
    logPath: string;
    apiKey: string;
    cacheStorage: string;
    rateLimit: number;
    rtl: boolean;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<SettingsFormData>({
    general: {
      siteTitle: '',
      siteDescription: '',
      contactEmail: '',
    },
    email: {
      smtpServer: '',
      smtpPort: '',
      smtpUsername: '',
      smtpPassword: '',
    },
    security: {
      twoFactorAuth: false,
      ipRestriction: false,
      minPasswordLength: 8,
      sessionDuration: 30,
    },
    social: {
      instagram: '',
      telegram: '',
      linkedin: '',
      twitter: '',
    },
    database: {
      server: '',
      port: '',
      name: '',
      username: '',
      password: '',
      type: 'mysql',
      autoBackup: false,
      rtl: false,
    },
    advanced: {
      debugMode: false,
      cacheEnabled: true,
      apiRateLimit: true,
      cacheDuration: 60,
      apiRequestLimit: 100,
      maxUploadSize: 10,
      errorLevel: 'error',
      logPath: '',
      apiKey: '',
      cacheStorage: 'memory',
      rateLimit: 100,
      rtl: false,
    },
  });

  const handleInputChange = (
    tab: keyof SettingsFormData,
    field: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Form data:', formData);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 min-h-screen rtl bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-[rgb(var(--c-primary-100))]" style={{ direction: 'rtl' }}>
      <div className="flex flex-col space-y-8">
        {/* Header Section with Gradient */}
        <div className="relative overflow-hidden rounded-2xl border shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-l from-[rgb(var(--c-primary-400))] via-[rgb(var(--c-primary-300))] to-transparent opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[rgb(var(--c-primary-300))] via-[rgb(var(--c-primary-200))] to-transparent opacity-70" />
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-[rgb(var(--c-primary-300))] blur-3xl opacity-20" />
          <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-[rgb(var(--c-primary-400))] blur-3xl opacity-20" />

          <div className="relative p-4 sm:p-6 md:p-8">
            <div className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium text-[rgb(var(--c-primary-600))] border border-[rgb(var(--c-primary-200))] shadow-sm">
              تنظیمات سیستم
            </div>
            <div className="mt-4 sm:mt-6 space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-[rgb(var(--c-primary-700))] via-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))]">
                پیکربندی و مدیریت سیستم
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-[rgb(var(--c-primary-900))] max-w-2xl">
                در این بخش می‌توانید تنظیمات کلی سیستم، پیکربندی ایمیل، شبکه‌های اجتماعی و سایر تنظیمات را مدیریت کنید.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="flex space-x-2 space-x-reverse overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 space-x-reverse rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[rgb(var(--c-primary-600))] text-white'
                    : 'text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))]'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="mr-2">{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'general' && (
            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--c-primary-100))] bg-white/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
              <div className="relative p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="border-b border-[rgb(var(--c-primary-100))] pb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-primary-900))]">تنظیمات عمومی سایت</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--c-primary-600))]">
                      تنظیمات اصلی سایت را در اینجا مدیریت کنید
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        عنوان سایت
                      </label>
                      <input
                        type="text"
                        value={formData.general.siteTitle}
                        onChange={(e) => handleInputChange('general', 'siteTitle', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="عنوان سایت را وارد کنید"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        توضیحات سایت
                      </label>
                      <input
                        type="text"
                        value={formData.general.siteDescription}
                        onChange={(e) => handleInputChange('general', 'siteDescription', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="توضیحات سایت را وارد کنید"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        ایمیل تماس
                      </label>
                      <input
                        type="email"
                        value={formData.general.contactEmail}
                        onChange={(e) => handleInputChange('general', 'contactEmail', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="ایمیل تماس را وارد کنید"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t border-[rgb(var(--c-primary-100))]">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]"
                    >
                      بازنشانی
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]"
                    >
                      ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--c-primary-100))] bg-white/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
              <div className="relative p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="border-b border-[rgb(var(--c-primary-100))] pb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-primary-900))]">تنظیمات SMTP</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--c-primary-600))]">
                      تنظیمات سرور SMTP برای ارسال ایمیل
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        سرور SMTP
                      </label>
                      <input
                        type="text"
                        value={formData.email.smtpServer}
                        onChange={(e) => handleInputChange('email', 'smtpServer', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="smtp.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        پورت
                      </label>
                      <input
                        type="text"
                        value={formData.email.smtpPort}
                        onChange={(e) => handleInputChange('email', 'smtpPort', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="587"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        نام کاربری
                      </label>
                      <input
                        type="text"
                        value={formData.email.smtpUsername}
                        onChange={(e) => handleInputChange('email', 'smtpUsername', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="username@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        رمز عبور
                      </label>
                      <input
                        type="password"
                        value={formData.email.smtpPassword}
                        onChange={(e) => handleInputChange('email', 'smtpPassword', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t border-[rgb(var(--c-primary-100))]">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]"
                    >
                      بازنشانی
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]"
                    >
                      ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--c-primary-100))] bg-white/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
              <div className="relative p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="border-b border-[rgb(var(--c-primary-100))] pb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-primary-900))]">تنظیمات امنیتی</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--c-primary-600))]">
                      تنظیمات امنیتی و دسترسی‌های سیستم
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[rgb(var(--c-primary-900))]">احراز هویت دو مرحله‌ای</h4>
                        <p className="text-xs text-[rgb(var(--c-primary-600))]">فعال‌سازی احراز هویت دو مرحله‌ای برای افزایش امنیت</p>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-400))] focus:ring-offset-2 ${
                          formData.security.twoFactorAuth ? 'bg-[rgb(var(--c-primary-600))]' : 'bg-[rgb(var(--c-primary-200))]'
                        }`}
                        onClick={() => handleInputChange('security', 'twoFactorAuth', !formData.security.twoFactorAuth)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.security.twoFactorAuth ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[rgb(var(--c-primary-900))]">محدودیت IP</h4>
                        <p className="text-xs text-[rgb(var(--c-primary-600))]">محدود کردن دسترسی به IP‌های مشخص</p>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-400))] focus:ring-offset-2 ${
                          formData.security.ipRestriction ? 'bg-[rgb(var(--c-primary-600))]' : 'bg-[rgb(var(--c-primary-200))]'
                        }`}
                        onClick={() => handleInputChange('security', 'ipRestriction', !formData.security.ipRestriction)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.security.ipRestriction ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        حداقل طول رمز عبور
                      </label>
                      <select
                        value={formData.security.minPasswordLength}
                        onChange={(e) => handleInputChange('security', 'minPasswordLength', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 pr-8 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                      >
                        <option value="6">6 کاراکتر</option>
                        <option value="8">8 کاراکتر</option>
                        <option value="10">10 کاراکتر</option>
                        <option value="12">12 کاراکتر</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        مدت زمان نشست کاربری
                      </label>
                      <select
                        value={formData.security.sessionDuration}
                        onChange={(e) => handleInputChange('security', 'sessionDuration', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 pr-8 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                      >
                        <option value="30">30 دقیقه</option>
                        <option value="60">1 ساعت</option>
                        <option value="120">2 ساعت</option>
                        <option value="240">4 ساعت</option>
                        <option value="480">8 ساعت</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t border-[rgb(var(--c-primary-100))]">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]"
                    >
                      بازنشانی
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]"
                    >
                      ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--c-primary-100))] bg-white/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
              <div className="relative p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="border-b border-[rgb(var(--c-primary-100))] pb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-primary-900))]">شبکه‌های اجتماعی</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--c-primary-600))]">
                      تنظیمات و پیکربندی شبکه‌های اجتماعی
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        اینستاگرام
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.social.instagram}
                          onChange={(e) => handleInputChange('social', 'instagram', e.target.value)}
                          className="flex-1 rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                          placeholder="نام کاربری اینستاگرام"
                        />
                        <button className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]">
                          اتصال
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        تلگرام
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.social.telegram}
                          onChange={(e) => handleInputChange('social', 'telegram', e.target.value)}
                          className="flex-1 rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                          placeholder="نام کاربری تلگرام"
                        />
                        <button className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]">
                          اتصال
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        لینکدین
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.social.linkedin}
                          onChange={(e) => handleInputChange('social', 'linkedin', e.target.value)}
                          className="flex-1 rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                          placeholder="آدرس پروفایل لینکدین"
                        />
                        <button className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]">
                          اتصال
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        توییتر
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.social.twitter}
                          onChange={(e) => handleInputChange('social', 'twitter', e.target.value)}
                          className="flex-1 rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                          placeholder="نام کاربری توییتر"
                        />
                        <button className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]">
                          اتصال
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t border-[rgb(var(--c-primary-100))]">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]"
                    >
                      بازنشانی
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]"
                    >
                      ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--c-primary-100))] bg-white/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
              <div className="relative p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="border-b border-[rgb(var(--c-primary-100))] pb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-primary-900))]">تنظیمات پایگاه داده</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--c-primary-600))]">
                      پیکربندی و مدیریت پایگاه داده
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        آدرس سرور
                      </label>
                      <input
                        type="text"
                        value={formData.database.server}
                        onChange={(e) => handleInputChange('database', 'server', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="localhost"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        پورت
                      </label>
                      <input
                        type="text"
                        value={formData.database.port}
                        onChange={(e) => handleInputChange('database', 'port', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="3306"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        نام پایگاه داده
                      </label>
                      <input
                        type="text"
                        value={formData.database.name}
                        onChange={(e) => handleInputChange('database', 'name', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="blog_db"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        نام کاربری
                      </label>
                      <input
                        type="text"
                        value={formData.database.username}
                        onChange={(e) => handleInputChange('database', 'username', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="root"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        رمز عبور
                      </label>
                      <input
                        type="password"
                        value={formData.database.password}
                        onChange={(e) => handleInputChange('database', 'password', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        نوع پایگاه داده
                      </label>
                      <select
                        value={formData.database.type}
                        onChange={(e) => handleInputChange('database', 'type', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 pr-8 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                      >
                        <option value="mysql">MySQL</option>
                        <option value="postgresql">PostgreSQL</option>
                        <option value="mongodb">MongoDB</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between space-x-4 space-x-reverse">
                    <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                      پشتیبان‌گیری خودکار
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.database.autoBackup}
                        onChange={(e) => handleInputChange('database', 'autoBackup', e.target.checked)}
                        className="h-4 w-4 ml-2 rounded border-[rgb(var(--c-primary-300))] text-[rgb(var(--c-primary-600))] focus:ring-[rgb(var(--c-primary-500))]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between space-x-4 space-x-reverse">
                    <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                      راست به چپ
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.database.rtl}
                        onChange={(e) => handleInputChange('database', 'rtl', e.target.checked)}
                        className="h-4 w-4 ml-2 rounded border-[rgb(var(--c-primary-300))] text-[rgb(var(--c-primary-600))] focus:ring-[rgb(var(--c-primary-500))]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t border-[rgb(var(--c-primary-100))]">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]"
                    >
                      تست اتصال
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]"
                    >
                      ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--c-primary-100))] bg-white/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))] to-transparent opacity-50" />
              <div className="relative p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="border-b border-[rgb(var(--c-primary-100))] pb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-primary-900))]">تنظیمات پیشرفته</h3>
                    <p className="mt-1 text-sm text-[rgb(var(--c-primary-600))]">
                      تنظیمات پیشرفته سیستم
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[rgb(var(--c-primary-900))]">حالت دیباگ</h4>
                        <p className="text-xs text-[rgb(var(--c-primary-600))]">فعال‌سازی گزارش‌های خطا و اشکال‌زدایی</p>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-400))] focus:ring-offset-2 ${
                          formData.advanced.debugMode ? 'bg-[rgb(var(--c-primary-600))]' : 'bg-[rgb(var(--c-primary-200))]'
                        }`}
                        onClick={() => handleInputChange('advanced', 'debugMode', !formData.advanced.debugMode)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.advanced.debugMode ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[rgb(var(--c-primary-900))]">ذخیره‌سازی کش</h4>
                        <p className="text-xs text-[rgb(var(--c-primary-600))]">فعال‌سازی سیستم کش برای بهبود عملکرد</p>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-400))] focus:ring-offset-2 ${
                          formData.advanced.cacheEnabled ? 'bg-[rgb(var(--c-primary-600))]' : 'bg-[rgb(var(--c-primary-200))]'
                        }`}
                        onClick={() => handleInputChange('advanced', 'cacheEnabled', !formData.advanced.cacheEnabled)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.advanced.cacheEnabled ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[rgb(var(--c-primary-900))]">محدودیت درخواست API</h4>
                        <p className="text-xs text-[rgb(var(--c-primary-600))]">محدودیت تعداد درخواست‌های API</p>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-400))] focus:ring-offset-2 ${
                          formData.advanced.apiRateLimit ? 'bg-[rgb(var(--c-primary-600))]' : 'bg-[rgb(var(--c-primary-200))]'
                        }`}
                        onClick={() => handleInputChange('advanced', 'apiRateLimit', !formData.advanced.apiRateLimit)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.advanced.apiRateLimit ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        مدت زمان کش (دقیقه)
                      </label>
                      <input
                        type="number"
                        value={formData.advanced.cacheDuration}
                        onChange={(e) => handleInputChange('advanced', 'cacheDuration', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="60"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        محدودیت درخواست API (در دقیقه)
                      </label>
                      <select
                        value={formData.advanced.rateLimit}
                        onChange={(e) => handleInputChange('advanced', 'rateLimit', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 pr-8 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                      >
                        <option value="100">100  درخواست در دقیقه</option>
                        <option value="500">500  درخواست در دقیقه</option>
                        <option value="1000">1000  درخواست در دقیقه</option>
                        <option value="5000">5000  درخواست در دقیقه</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        حداکثر اندازه فایل آپلود (MB)
                      </label>
                      <input
                        type="number"
                        value={formData.advanced.maxUploadSize}
                        onChange={(e) => handleInputChange('advanced', 'maxUploadSize', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        سطح گزارش خطا
                      </label>
                      <select
                        value={formData.advanced.errorLevel}
                        onChange={(e) => handleInputChange('advanced', 'errorLevel', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 pr-8 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                      >
                        <option value="error">خطا</option>
                        <option value="warning">هشدار</option>
                        <option value="info">اطلاعات</option>
                        <option value="debug">دیباگ</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        مسیر ذخیره‌سازی لاگ‌ها
                      </label>
                      <input
                        type="text"
                        value={formData.advanced.logPath}
                        onChange={(e) => handleInputChange('advanced', 'logPath', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                        placeholder="/var/log/blog"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        کلید API
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={formData.advanced.apiKey}
                          onChange={(e) => handleInputChange('advanced', 'apiKey', e.target.value)}
                          className="flex-1 rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                          placeholder="Enter API key"
                          readOnly
                        />
                        <button className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]">
                          تولید کلید جدید
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                        ذخیره‌سازی کش
                      </label>
                      <select
                        value={formData.advanced.cacheStorage}
                        onChange={(e) => handleInputChange('advanced', 'cacheStorage', e.target.value)}
                        className="w-full rounded-lg border border-[rgb(var(--c-primary-200))] bg-white/50 px-3 py-2 pr-8 text-sm text-[rgb(var(--c-primary-900))] shadow-sm focus:border-[rgb(var(--c-primary-300))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary-300))]"
                      >
                        <option value="memory">حافظه  موقت</option>
                        <option value="redis">Redis  کش</option>
                        <option value="file">فایل  سیستم</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between space-x-4 space-x-reverse">
                    <label className="text-sm font-medium text-[rgb(var(--c-primary-700))]">
                      راست به چپ
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.advanced.rtl}
                        onChange={(e) => handleInputChange('advanced', 'rtl', e.target.checked)}
                        className="h-4 w-4 ml-2 rounded border-[rgb(var(--c-primary-300))] text-[rgb(var(--c-primary-600))] focus:ring-[rgb(var(--c-primary-500))]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t border-[rgb(var(--c-primary-100))]">
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--c-primary-600))] hover:bg-[rgb(var(--c-primary-50))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-200))]"
                    >
                      بازنشانی
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[rgb(var(--c-primary-600))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--c-primary-700))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary-500))]"
                    >
                      ذخیره تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
