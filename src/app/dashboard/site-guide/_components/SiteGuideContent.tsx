'use client';

import {
  Activity,
  BadgeCheck,
  BarChart2,
  Bell,
  BookOpen,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Globe,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  Mail,
  Map as MapIcon,
  Megaphone,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Sparkles,
  Tag,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import s from './SiteGuideContent.module.css';

type Tone = 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';

interface RouteItem {
  label: string;
  path: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: Tone;
  tone: Tone;
  ownerOnly?: boolean;
}

interface SectionDef {
  id: string;
  title: string;
  icon: ReactNode;
  tone: Tone;
  count?: number;
  routes: RouteItem[];
}

const iconSize = 16;

const SECTIONS: SectionDef[] = [
  /* ────────────────────────────────────────────────
     ۱. صفحات عمومی سایت
  ──────────────────────────────────────────────── */
  {
    id: 'site',
    title: 'صفحات عمومی سایت',
    icon: <Globe size={20} />,
    tone: 'emerald',
    routes: [
      {
        label: 'صفحه اصلی',
        path: '/',
        description: 'لندینگ اصلی — Hero، نرخ لحظه‌ای، صرافی‌ها، مقالات و اخبار',
        icon: <LayoutDashboard size={iconSize} />,
        badge: 'عمومی',
        badgeTone: 'emerald',
        tone: 'emerald',
      },
      {
        label: 'نرخ ارز',
        path: '/exchange-rates',
        description: 'جدول کامل نرخ‌های لحظه‌ای افغانی، دلار، یورو و سایر ارزها',
        icon: <CircleDollarSign size={iconSize} />,
        badge: 'زنده',
        badgeTone: 'amber',
        tone: 'amber',
      },
      {
        label: 'صرافی‌ها',
        path: '/exchanges',
        description: 'فهرست صرافی‌های ثبت‌شده با نرخ و اطلاعات تماس',
        icon: <Building2 size={iconSize} />,
        tone: 'emerald',
      },
      {
        label: 'جستجو',
        path: '/search',
        description: 'جستجوی سایت‌وید در پست‌ها، صرافی‌ها و اخبار',
        icon: <Search size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'وبلاگ',
        path: '/blog',
        description: 'آرشیو کامل مقالات و اخبار مالی',
        icon: <BookOpen size={iconSize} />,
        tone: 'emerald',
      },
      {
        label: 'اخبار مالی',
        path: '/financial-news',
        description: 'آخرین اخبار بازارهای مالی و ارزی',
        icon: <FileText size={iconSize} />,
        tone: 'emerald',
      },
      {
        label: 'تحلیل بازار',
        path: '/market-analysis',
        description: 'تحلیل‌های تکنیکال و بنیادی بازارهای ارزی',
        icon: <BarChart2 size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'نرخ اعتباری',
        path: '/credit-rates',
        description: 'نرخ سود، تسهیلات و خطوط اعتباری',
        icon: <CreditCard size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'انتقال پول',
        path: '/money-transfer',
        description: 'جدول مقایسه و راهنمای انتقال بین‌المللی',
        icon: <RefreshCw size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'پرداخت آنلاین',
        path: '/online-payment',
        description: 'درگاه‌های پرداخت آنلاین پشتیبانی‌شده',
        icon: <CreditCard size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'خدمات',
        path: '/services',
        description: 'معرفی کامل خدمات پلتفرم',
        icon: <Sparkles size={iconSize} />,
        tone: 'emerald',
      },
      {
        label: 'درخواست ثبت صرافی',
        path: '/apply-exchange',
        description: 'فرم درخواست ثبت صرافی جدید در سایت',
        icon: <ClipboardList size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'مرکز کمک',
        path: '/help-center',
        description: 'مستندات کمکی و سؤالات متداول',
        icon: <HelpCircle size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'سؤالات متداول',
        path: '/faq',
        description: 'پاسخ به پرسش‌های رایج کاربران',
        icon: <HelpCircle size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'پشتیبانی',
        path: '/support',
        description: 'تماس با پشتیبانی و ارسال تیکت',
        icon: <Mail size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'بازخورد',
        path: '/feedback',
        description: 'فرم بازخورد و پیشنهادات کاربران',
        icon: <Mail size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'درباره ما',
        path: '/about',
        description: 'معرفی تیم و پلتفرم',
        icon: <Info size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'حریم خصوصی',
        path: '/privacy-policy',
        description: 'سیاست حریم خصوصی و حفاظت از داده',
        icon: <Lock size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'شرایط استفاده',
        path: '/terms',
        description: 'قوانین و شرایط استفاده از سرویس',
        icon: <FileText size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'ردیابی تراکنش',
        path: '/track',
        description: 'پیگیری وضعیت تراکنش‌ها با کد پیگیری',
        icon: <MapIcon size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'اشتراک',
        path: '/subscription',
        description: 'خرید اشتراک و پلن‌های ویژه کاربران',
        icon: <Sparkles size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'کیف پول (عمومی)',
        path: '/wallet',
        description: 'صفحه عمومی کیف پول برای کاربران ثبت‌شده',
        icon: <Wallet size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'احراز هویت',
        path: '/kyc',
        description: 'فرآیند احراز هویت برای کاربران و صرافی‌ها',
        icon: <BadgeCheck size={iconSize} />,
        tone: 'emerald',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۲. داشبورد مدیریت — محتوا
  ──────────────────────────────────────────────── */
  {
    id: 'dashboard-content',
    title: 'داشبورد — محتوا',
    icon: <FileText size={20} />,
    tone: 'primary',
    routes: [
      {
        label: 'داشبورد اصلی',
        path: '/dashboard',
        description: 'صفحه اصلی مدیریت — KPIها، آمار لحظه‌ای، فعالیت اخیر',
        icon: <LayoutDashboard size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'پست‌ها',
        path: '/dashboard/posts',
        description: 'مدیریت کامل مقالات — لیست، ایجاد، ویرایش، زمان‌بندی',
        icon: <FileText size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'ایجاد پست',
        path: '/dashboard/posts/create',
        description: 'ویرایشگر پست جدید با آپلود تصویر و SEO',
        icon: <FileText size={iconSize} />,
        badge: 'ایجاد',
        badgeTone: 'emerald',
        tone: 'emerald',
      },
      {
        label: 'تقویم پست‌ها',
        path: '/dashboard/posts/calendar',
        description: 'تقویم بصری زمان‌بندی انتشار مقالات',
        icon: <ClipboardList size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'دسته‌بندی',
        path: '/dashboard/categories',
        description: 'مدیریت دسته‌بندی مقالات و اخبار',
        icon: <FolderOpen size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'گزارش‌ها',
        path: '/dashboard/reports',
        description: 'گزارش ترافیک، بازدید، نرخ تبدیل و عملکرد محتوا',
        icon: <BarChart2 size={iconSize} />,
        tone: 'violet',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۳. داشبورد — عملیات صرافی
  ──────────────────────────────────────────────── */
  {
    id: 'dashboard-exchange',
    title: 'داشبورد — عملیات صرافی',
    icon: <Building2 size={20} />,
    tone: 'amber',
    routes: [
      {
        label: 'صرافی‌ها',
        path: '/dashboard/exchanges',
        description: 'مدیریت کامل صرافی‌های ثبت‌شده در پلتفرم',
        icon: <Building2 size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'کارکنان صرافی',
        path: '/dashboard/exchange-staff',
        description: 'مدیریت پرسنل و نقش‌های داخلی صرافی‌ها',
        icon: <Users size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'نرخ ارز',
        path: '/dashboard/exchange-rates',
        description: 'مدیریت نرخ‌های ارز، لیست نرخ‌ها و فهرست‌ها',
        icon: <CircleDollarSign size={iconSize} />,
        badge: 'زنده',
        badgeTone: 'amber',
        tone: 'amber',
      },
      {
        label: 'تأیید قیمت‌ها',
        path: '/dashboard/exchange-quotes',
        description: 'بررسی و تأیید قیمت‌گذاری پیشنهادی صرافی‌ها',
        icon: <Tag size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'جدول مقایسه',
        path: '/dashboard/transfer-providers',
        description: 'صرافی‌های حاضر در جدول مقایسه نرخ انتقال',
        icon: <Layers size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'نرخ‌های اعتباری',
        path: '/dashboard/credit-rates',
        description: 'تنظیم نرخ سود، تسهیلات و خطوط اعتباری',
        icon: <CreditCard size={iconSize} />,
        tone: 'amber',
      },
      {
        label: 'تسویه‌حساب',
        path: '/dashboard/settlements',
        description: 'مدیریت تسویه‌حساب مالی صرافی‌ها',
        icon: <CreditCard size={iconSize} />,
        ownerOnly: true,
        badge: 'مالک',
        badgeTone: 'rose',
        tone: 'rose',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۴. داشبورد — فین‌تک
  ──────────────────────────────────────────────── */
  {
    id: 'dashboard-fintech',
    title: 'داشبورد — فین‌تک',
    icon: <ShieldCheck size={20} />,
    tone: 'rose',
    routes: [
      {
        label: 'مشتریان',
        path: '/dashboard/customers',
        description: 'مدیریت مشتریان پلتفرم صرافی‌ها',
        icon: <Users size={iconSize} />,
        tone: 'rose',
      },
      {
        label: 'بررسی KYC',
        path: '/dashboard/kyc-review',
        description: 'تأیید یا رد درخواست‌های احراز هویت کاربران',
        icon: <BadgeCheck size={iconSize} />,
        tone: 'rose',
      },
      {
        label: 'بررسی تقلب',
        path: '/dashboard/fraud-review',
        description: 'صف بررسی تراکنش‌های مشکوک و هشدارهای تقلب',
        icon: <ShieldX size={iconSize} />,
        badge: 'امنیتی',
        badgeTone: 'rose',
        tone: 'rose',
      },
      {
        label: 'گزارش ممیزی',
        path: '/dashboard/audit-log',
        description: 'لاگ کامل تغییرات سیستم برای پایش و امنیت',
        icon: <ClipboardCheck size={iconSize} />,
        ownerOnly: true,
        badge: 'مالک',
        badgeTone: 'rose',
        tone: 'rose',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۵. داشبورد — پلتفرم
  ──────────────────────────────────────────────── */
  {
    id: 'dashboard-platform',
    title: 'داشبورد — پلتفرم',
    icon: <Zap size={20} />,
    tone: 'violet',
    routes: [
      {
        label: 'مرکز پایش',
        path: '/dashboard/observability',
        description: 'uptime، خطا، کارایی و incidentها — نمای زنده سلامت سیستم',
        icon: <Radio size={iconSize} />,
        badge: 'زنده',
        badgeTone: 'amber',
        tone: 'violet',
      },
      {
        label: 'مرکز ارتباطات',
        path: '/dashboard/communication',
        description: 'broadcast، کمپین تبلیغاتی و مدیریت مخاطبان هدف',
        icon: <Megaphone size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'مرکز Job',
        path: '/dashboard/jobs',
        description: 'صف job، cron، retry و صف پیام‌های مرده (DLQ)',
        icon: <Activity size={iconSize} />,
        ownerOnly: true,
        badge: 'فنی',
        badgeTone: 'violet',
        tone: 'violet',
      },
      {
        label: 'تیکت‌ها',
        path: '/dashboard/helpdesk',
        description: 'سیستم تیکت داخلی — دریافت و پاسخ به درخواست‌ها',
        icon: <ClipboardList size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'تأییدیه‌ها',
        path: '/dashboard/approvals',
        description: 'جریان‌های تأیید چندمرحله‌ای برای عملیات حساس',
        icon: <ClipboardCheck size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'تبلیغات',
        path: '/dashboard/advertisements',
        description: 'مدیریت بنرها و آگهی‌های سایت',
        icon: <Megaphone size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'تبلیغ header',
        path: '/dashboard/header-ad',
        description: 'بنر تبلیغاتی نوار بالای صفحه',
        icon: <Megaphone size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'درخواست‌های خدمات',
        path: '/dashboard/service-requests',
        description: 'مدیریت درخواست‌های ثبت‌شده توسط کاربران سایت',
        icon: <ClipboardList size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'اعلان‌ها',
        path: '/dashboard/notifications',
        description: 'مرکز اعلان‌های سیستم و کاربران',
        icon: <Bell size={iconSize} />,
        tone: 'slate',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۶. داشبورد — مدیریت (فقط مالک/ادمین)
  ──────────────────────────────────────────────── */
  {
    id: 'dashboard-admin',
    title: 'داشبورد — مدیریت',
    icon: <Settings size={20} />,
    tone: 'slate',
    routes: [
      {
        label: 'کاربران',
        path: '/dashboard/users',
        description: 'مدیریت کلیه کاربران، نقش‌ها و وضعیت‌ها',
        icon: <Users size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'نقش‌ها',
        path: '/dashboard/roles',
        description: 'تعریف و ویرایش نقش‌های سیستمی و دسترسی‌ها',
        icon: <ShieldCheck size={iconSize} />,
        ownerOnly: true,
        badge: 'مالک',
        badgeTone: 'rose',
        tone: 'rose',
      },
      {
        label: 'مجوزها',
        path: '/dashboard/permissions',
        description: 'مدیریت گرانولار مجوزهای دسترسی به بخش‌ها',
        icon: <Lock size={iconSize} />,
        ownerOnly: true,
        badge: 'مالک',
        badgeTone: 'rose',
        tone: 'rose',
      },
      {
        label: 'تنظیمات',
        path: '/dashboard/settings',
        description: 'تنظیمات کلی سایت — نام، لوگو، SEO، ایمیل و...',
        icon: <Settings size={iconSize} />,
        ownerOnly: true,
        badge: 'مالک',
        badgeTone: 'rose',
        tone: 'rose',
      },
      {
        label: 'اشتراک',
        path: '/dashboard/subscription',
        description: 'مدیریت پلن اشتراک و صورتحساب پلتفرم',
        icon: <Sparkles size={iconSize} />,
        tone: 'violet',
      },
      {
        label: 'آدرس صورتحساب',
        path: '/dashboard/billing-address',
        description: 'اطلاعات مالیاتی و آدرس صورتحساب',
        icon: <MapIcon size={iconSize} />,
        tone: 'slate',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۷. پنل صرافی (/exchange)
  ──────────────────────────────────────────────── */
  {
    id: 'exchange-panel',
    title: 'پنل صرافی',
    icon: <Building2 size={20} />,
    tone: 'cyan',
    routes: [
      {
        label: 'داشبورد صرافی',
        path: '/exchange/dashboard',
        description: 'پنل اختصاصی صرافی — آمار، نرخ‌ها و عملیات روزانه',
        icon: <LayoutDashboard size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'قیمت‌گذاری',
        path: '/exchange/quotes',
        description: 'ثبت و مدیریت قیمت‌های ارائه‌شده توسط صرافی',
        icon: <Tag size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'مشتریان صرافی',
        path: '/exchange/customers',
        description: 'مدیریت مشتریان ثبت‌شده در صرافی',
        icon: <Users size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'تراکنش‌ها',
        path: '/exchange/transactions',
        description: 'تاریخچه تراکنش‌های صرافی',
        icon: <RefreshCw size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'نرخ‌های صرافی',
        path: '/exchange/rates',
        description: 'نرخ‌های ارزی اختصاصی صرافی',
        icon: <CircleDollarSign size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'بررسی KYC مشتریان',
        path: '/exchange/kyc-review',
        description: 'تأیید مدارک احراز هویت مشتریان صرافی',
        icon: <BadgeCheck size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'کارکنان صرافی',
        path: '/exchange/staff',
        description: 'مدیریت پرسنل داخلی صرافی',
        icon: <Users size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'گزارش‌های صرافی',
        path: '/exchange/reports',
        description: 'گزارش مالی و عملیاتی اختصاصی صرافی',
        icon: <BarChart2 size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'تسویه صرافی',
        path: '/exchange/settlement',
        description: 'مدیریت تسویه‌حساب مالی صرافی',
        icon: <CreditCard size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'خدمات آنلاین صرافی',
        path: '/exchange/services',
        description: 'تنظیم خدمات آنلاین ارائه‌شده توسط صرافی',
        icon: <Sparkles size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'پروفایل صرافی',
        path: '/exchange/profile',
        description: 'اطلاعات عمومی و هویت صرافی',
        icon: <Building2 size={iconSize} />,
        tone: 'cyan',
      },
      {
        label: 'تنظیمات صرافی',
        path: '/exchange/settings',
        description: 'پیکربندی و تنظیمات داخلی صرافی',
        icon: <Settings size={iconSize} />,
        tone: 'cyan',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۸. پورتال مشتری (/customer)
  ──────────────────────────────────────────────── */
  {
    id: 'customer-portal',
    title: 'پورتال مشتری',
    icon: <Users size={20} />,
    tone: 'primary',
    routes: [
      {
        label: 'داشبورد مشتری',
        path: '/customer/dashboard',
        description: 'خلاصه وضعیت مالی، اعلان‌ها و فعالیت اخیر',
        icon: <LayoutDashboard size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'کیف پول',
        path: '/customer/wallet',
        description: 'موجودی، حساب‌ها و تاریخچه تراکنش‌ها',
        icon: <Wallet size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'حساب‌ها',
        path: '/customer/accounts',
        description: 'مدیریت حساب‌های بانکی و ارزی مشتری',
        icon: <CreditCard size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'ارزهای دیجیتال',
        path: '/customer/crypto',
        description: 'کیف پول ارزهای دیجیتال و نرخ لحظه‌ای',
        icon: <CircleDollarSign size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'انتقال وجه',
        path: '/customer/transfer',
        description: 'واریز، برداشت، انتقال داخلی و تبدیل ارز',
        icon: <RefreshCw size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'مخاطبان',
        path: '/customer/beneficiaries',
        description: 'مدیریت حساب‌های مقصد پرتکرار',
        icon: <Users size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'تراکنش‌ها',
        path: '/customer/transactions',
        description: 'تاریخچه کامل تراکنش‌های مشتری',
        icon: <Activity size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'درخواست‌های من',
        path: '/customer/requests',
        description: 'درخواست‌های ارسال‌شده به صرافی',
        icon: <ClipboardList size={iconSize} />,
        tone: 'primary',
      },
      {
        label: 'احراز هویت',
        path: '/customer/kyc',
        description: 'بارگذاری مدارک و وضعیت احراز هویت',
        icon: <BadgeCheck size={iconSize} />,
        tone: 'emerald',
      },
      {
        label: 'مدارک',
        path: '/customer/documents',
        description: 'مدارک بارگذاری‌شده و وضعیت تأیید آن‌ها',
        icon: <FileText size={iconSize} />,
        tone: 'emerald',
      },
      {
        label: 'مرکز امنیت',
        path: '/customer/security',
        description: 'تغییر رمز، فعال‌سازی 2FA و مدیریت دسترسی‌ها',
        icon: <ShieldCheck size={iconSize} />,
        tone: 'rose',
      },
      {
        label: 'احراز هویت دو مرحله‌ای',
        path: '/customer/2fa',
        description: 'پیکربندی TOTP برای امنیت بیشتر',
        icon: <ShieldCheck size={iconSize} />,
        tone: 'rose',
      },
      {
        label: 'دستگاه‌های متصل',
        path: '/customer/devices',
        description: 'مشاهده و مدیریت دستگاه‌هایی که وارد شده‌اند',
        icon: <Smartphone size={iconSize} />,
        tone: 'rose',
      },
      {
        label: 'اعلان‌ها',
        path: '/customer/notifications',
        description: 'پیام‌ها و اعلان‌های مهم از صرافی و پلتفرم',
        icon: <Bell size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'توسعه‌دهندگان',
        path: '/customer/developer',
        description: 'پنل API — دریافت و مدیریت کلیدهای دسترسی',
        icon: <Activity size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'پروفایل',
        path: '/customer/profile',
        description: 'ویرایش اطلاعات شخصی مشتری',
        icon: <Users size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'تنظیمات',
        path: '/customer/settings',
        description: 'تنظیمات اکانت و ترجیحات کاربری',
        icon: <Settings size={iconSize} />,
        tone: 'slate',
      },
    ],
  },
  /* ────────────────────────────────────────────────
     ۹. ورود و احراز هویت
  ──────────────────────────────────────────────── */
  {
    id: 'auth',
    title: 'احراز هویت و ورود',
    icon: <Lock size={20} />,
    tone: 'slate',
    routes: [
      {
        label: 'ورود',
        path: '/signin',
        description: 'صفحه ورود با ایمیل/رمز یا OAuth',
        icon: <Lock size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'ثبت‌نام',
        path: '/signup',
        description: 'ایجاد حساب کاربری جدید',
        icon: <Users size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'فراموشی رمز',
        path: '/forgot-password',
        description: 'دریافت لینک بازیابی رمز عبور',
        icon: <Lock size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'بازنشانی رمز',
        path: '/reset-password',
        description: 'تغییر رمز با توکن دریافت‌شده',
        icon: <Lock size={iconSize} />,
        tone: 'slate',
      },
      {
        label: 'تأیید ایمیل',
        path: '/verify-email',
        description: 'تأیید آدرس ایمیل با توکن',
        icon: <Mail size={iconSize} />,
        tone: 'slate',
      },
    ],
  },
];

const TONE_ICON_CLASS: Record<Tone, string> = {
  primary: s.tonePrimary,
  emerald: s.toneEmerald,
  amber: s.toneAmber,
  rose: s.toneRose,
  violet: s.toneViolet,
  cyan: s.toneCyan,
  slate: s.toneSlate,
};

const BADGE_CLASS: Record<Tone, string> = {
  primary: s.badgePrimary,
  emerald: s.badgeEmerald,
  amber: s.badgeAmber,
  rose: s.badgeRose,
  violet: s.badgeViolet,
  cyan: s.badgeCyan,
  slate: s.badgeSlate,
};

function RouteCard({ item }: { item: RouteItem }) {
  return (
    <Link
      href={item.path}
      className={s.card}
      target={item.path.startsWith('http') ? '_blank' : undefined}
    >
      <div className={s.cardTop}>
        <span className={`${s.cardIcon} ${TONE_ICON_CLASS[item.tone]}`}>{item.icon}</span>
        <span className={s.cardLabel}>{item.label}</span>
        {item.badge && (
          <span className={`${s.cardBadge} ${BADGE_CLASS[item.badgeTone ?? item.tone]}`}>
            {item.badge}
          </span>
        )}
      </div>
      <p className={s.cardDesc}>{item.description}</p>
      <span className={s.cardPath}>{item.path}</span>
    </Link>
  );
}

function GuideSection({ section }: { section: SectionDef }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHeader}>
        <span className={`${s.sectionIcon} ${TONE_ICON_CLASS[section.tone]}`}>{section.icon}</span>
        <h2 className={s.sectionTitle}>{section.title}</h2>
        <span className={s.sectionBadge}>{section.routes.length} صفحه</span>
      </div>
      <div className={s.grid}>
        {section.routes.map((r) => (
          <RouteCard key={r.path} item={r} />
        ))}
      </div>
    </section>
  );
}

export function SiteGuideContent({
  userRole,
}: {
  userRole: 'OWNER' | 'SUPERADMIN' | 'ADMIN';
}) {
  const totalPages = SECTIONS.reduce((acc, s) => acc + s.routes.length, 0);

  return (
    <div dir="rtl" className={s.page}>
      {/* ── Hero ── */}
      <div className={s.hero}>
        <div className={s.heroBg} aria-hidden />
        <div className={s.heroText}>
          <span className={s.eyebrow}>راهنمای جامع سایت</span>
          <h1 className={s.heroTitle}>نقشه سایت و راهنمای بخش‌ها</h1>
          <p className={s.heroDesc}>
            تور کامل از تمام صفحات، بخش‌ها و route های پلتفرم. هر کارت لینک مستقیم به آن صفحه است.
            صفحات علامت‌گذاری‌شده با «مالک» فقط برای نقش مالک / سوپرادمین قابل دسترسی‌اند.
          </p>
          <div className={s.heroMeta}>
            <span
              className={s.cardBadge}
              style={{ fontSize: 'var(--ds-text-xs)', padding: '4px 12px' }}
            >
              {SECTIONS.length} بخش اصلی
            </span>
            <span
              className={s.cardBadge}
              style={{ fontSize: 'var(--ds-text-xs)', padding: '4px 12px' }}
            >
              {totalPages} صفحه مستند
            </span>
            <span
              className={`${s.cardBadge} ${BADGE_CLASS[userRole === 'ADMIN' ? 'amber' : 'rose']}`}
              style={{ fontSize: 'var(--ds-text-xs)', padding: '4px 12px' }}
            >
              نقش شما:{' '}
              {userRole === 'OWNER' ? 'مالک' : userRole === 'SUPERADMIN' ? 'سوپرادمین' : 'مدیر'}
            </span>
          </div>
        </div>
        <div className={s.heroIcon} aria-hidden>
          <MapIcon size={36} />
        </div>
      </div>

      {/* ── Info note ── */}
      <div className={s.infoBox}>
        <Info size={16} className={s.infoBoxIcon} />
        <p className={s.infoBoxText}>
          این صفحه به‌صورت خودکار از ساختار route های پروژه ساخته شده. روی هر کارت کلیک کنید تا
          مستقیماً به آن بخش بروید. کارت‌هایی که badge «مالک» دارند فقط برای نقش‌های OWNER و SUPERADMIN
          قابل دسترسی‌اند و دسترسی ADMIN به آن‌ها محدود است.
        </p>
      </div>

      {/* ── Sections ── */}
      {SECTIONS.map((section) => (
        <GuideSection key={section.id} section={section} />
      ))}
    </div>
  );
}
