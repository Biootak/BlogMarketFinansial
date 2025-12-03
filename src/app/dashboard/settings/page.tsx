'use client';

import { useState, useCallback } from 'react';
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
  type LucideIcon,
} from 'lucide-react';

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

// Toggle Switch Component
const ToggleSwitch = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    className={`
      relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full
      transition-all duration-300 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))] focus-visible:ring-offset-2
      ${enabled
        ? 'bg-gradient-to-r from-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-600))] shadow-lg shadow-[rgb(var(--c-primary-500))]/30'
        : 'bg-gray-200 dark:bg-gray-700'
      }
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white
        shadow-lg ring-0 transition-all duration-300 ease-out
        ${enabled ? '-translate-x-6' : '-translate-x-1'}
      `}
    />
  </button>
);

// Input Field Component
const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) => (
  <div className="group space-y-2">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`
        w-full rounded-xl border-2 border-gray-200/80 bg-white/80 backdrop-blur-sm
        px-4 py-3 text-sm text-gray-900
        shadow-sm shadow-gray-100/50
        transition-all duration-300 ease-out
        placeholder:text-gray-400
        hover:border-[rgb(var(--c-primary-200))] hover:shadow-md
        focus:border-[rgb(var(--c-primary-400))] focus:bg-white focus:shadow-lg
        focus:shadow-[rgb(var(--c-primary-100))]/50 focus:outline-none focus:ring-4
        focus:ring-[rgb(var(--c-primary-100))]/50
        dark:border-gray-700 dark:bg-gray-800/80 dark:text-white
        ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
      `}
    />
  </div>
);

// Select Field Component
const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
}) => (
  <div className="group space-y-2">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full rounded-xl border-2 border-gray-200/80 bg-white/80 backdrop-blur-sm
        px-4 py-3 pr-10 text-sm text-gray-900
        shadow-sm shadow-gray-100/50
        transition-all duration-300 ease-out
        hover:border-[rgb(var(--c-primary-200))] hover:shadow-md
        focus:border-[rgb(var(--c-primary-400))] focus:bg-white focus:shadow-lg
        focus:shadow-[rgb(var(--c-primary-100))]/50 focus:outline-none focus:ring-4
        focus:ring-[rgb(var(--c-primary-100))]/50
        dark:border-gray-700 dark:bg-gray-800/80 dark:text-white
      "
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Setting Toggle Row Component
const SettingToggleRow = ({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}) => (
  <div
    className="
      group flex items-center justify-between rounded-2xl
      bg-gradient-to-l from-gray-50/80 to-white/50 p-5
      border border-gray-100/80
      transition-all duration-300 ease-out
      hover:border-[rgb(var(--c-primary-100))] hover:shadow-md
      hover:shadow-[rgb(var(--c-primary-50))]/50
      dark:from-gray-800/50 dark:to-gray-900/50 dark:border-gray-700
    "
  >
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} />
  </div>
);

// Card Section Component
const CardSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div
    className="
      relative overflow-hidden rounded-3xl
      bg-white/70 backdrop-blur-xl
      border border-gray-200/60
      shadow-xl shadow-gray-200/40
      transition-all duration-500 ease-out
      hover:shadow-2xl hover:shadow-[rgb(var(--c-primary-100))]/30
      dark:bg-gray-900/70 dark:border-gray-700/60 dark:shadow-gray-900/40
    "
  >
    {/* Decorative gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--c-primary-50))]/30 via-transparent to-transparent pointer-events-none" />
    <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[rgb(var(--c-primary-200))]/20 blur-3xl" />
    <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-[rgb(var(--c-primary-300))]/10 blur-3xl" />

    <div className="relative p-6 sm:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--c-primary-500))] animate-pulse" />
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mr-5">{description}</p>
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>
    </div>
  </div>
);

// Action Buttons Component
const ActionButtons = ({ onReset }: { onReset?: () => void }) => (
  <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-gray-200/60 dark:border-gray-700/60">
    <button
      type="button"
      onClick={onReset}
      className="
        group flex items-center gap-2 rounded-xl px-5 py-2.5
        text-sm font-medium text-gray-600
        bg-gray-100/80 backdrop-blur-sm
        border border-gray-200/60
        transition-all duration-300 ease-out
        hover:bg-gray-200/80 hover:text-gray-900 hover:shadow-md
        focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
        dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700
        dark:hover:bg-gray-700/80 dark:hover:text-white
      "
    >
      <RefreshCw className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-180" />
      <span>بازنشانی</span>
    </button>
    <button
      type="submit"
      className="
        group flex items-center gap-2 rounded-xl px-6 py-2.5
        text-sm font-semibold text-white
        bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))]
        shadow-lg shadow-[rgb(var(--c-primary-500))]/30
        transition-all duration-300 ease-out
        hover:shadow-xl hover:shadow-[rgb(var(--c-primary-500))]/40
        hover:from-[rgb(var(--c-primary-700))] hover:to-[rgb(var(--c-primary-600))]
        hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary-500))]
        active:translate-y-0
      "
    >
      <Check className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
      <span>ذخیره تنظیمات</span>
    </button>
  </div>
);

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

  const handleInputChange = useCallback(
    (tab: keyof SettingsFormData, field: string, value: string | number | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form data:', formData);
  };

  return (
    <div
      className="min-h-screen rtl py-6 sm:py-8 lg:py-10"
      style={{ direction: 'rtl' }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col gap-8 lg:gap-10">
          {/* Hero Header */}
          <header
            className="
              relative overflow-hidden rounded-3xl
              bg-gradient-to-bl from-[rgb(var(--c-primary-600))] via-[rgb(var(--c-primary-500))] to-[rgb(var(--c-primary-400))]
              shadow-2xl shadow-[rgb(var(--c-primary-500))]/30
            "
          >
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
            <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-[rgb(var(--c-primary-300))]/20 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

            <div className="relative p-6 sm:p-8 lg:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="space-y-4">
                  <div
                    className="
                      inline-flex items-center gap-2 rounded-full
                      bg-white/15 backdrop-blur-md
                      px-4 py-2 text-sm font-medium text-white/90
                      border border-white/20
                      shadow-lg shadow-black/5
                    "
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>تنظیمات سیستم</span>
                  </div>
                  <h1
                    className="
                      text-3xl sm:text-4xl lg:text-5xl font-black text-white
                      tracking-tight leading-tight
                    "
                  >
                    پیکربندی و مدیریت
                  </h1>
                  <p className="text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
                    تمامی تنظیمات سیستم، ایمیل، امنیت و شبکه‌های اجتماعی را از اینجا مدیریت کنید
                  </p>
                </div>

                {/* Stats or quick info */}
                <div className="flex gap-4">
                  <div
                    className="
                      flex flex-col items-center justify-center
                      rounded-2xl bg-white/10 backdrop-blur-md
                      px-6 py-4 border border-white/20
                    "
                  >
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
            <nav
              className="
                lg:w-72 shrink-0
                lg:sticky lg:top-6 lg:self-start
              "
            >
              <div
                className="
                  rounded-2xl bg-white/70 backdrop-blur-xl
                  border border-gray-200/60
                  shadow-xl shadow-gray-200/30
                  p-3
                  dark:bg-gray-900/70 dark:border-gray-700/60
                "
              >
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          group relative flex items-center gap-3
                          rounded-xl px-4 py-3.5 min-w-max lg:min-w-0 lg:w-full
                          text-sm font-medium
                          transition-all duration-300 ease-out
                          ${isActive
                            ? 'bg-gradient-to-l from-[rgb(var(--c-primary-600))] to-[rgb(var(--c-primary-500))] text-white shadow-lg shadow-[rgb(var(--c-primary-500))]/30'
                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-white'
                          }
                        `}
                      >
                        <IconComponent
                          className={`
                            h-5 w-5 shrink-0
                            transition-transform duration-300
                            ${isActive ? '' : 'group-hover:scale-110'}
                          `}
                        />
                        <div className="flex flex-col items-start">
                          <span>{tab.name}</span>
                          <span
                            className={`
                              text-xs hidden lg:block
                              ${isActive ? 'text-white/70' : 'text-gray-400'}
                            `}
                          >
                            {tab.description}
                          </span>
                        </div>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-white/50 hidden lg:block" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>

            {/* Tab Content */}
            <form onSubmit={handleSubmit} className="flex-1 min-w-0">
