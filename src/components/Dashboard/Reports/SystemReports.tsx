'use client';

import { ChartSkeleton, StatsCardSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Download,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface SystemReportData {
  users: number;
  activeUsers: number;
  newUsers: number;
  posts: number;
  publishedPosts: number;
  comments: number;
  pendingComments: number;
  views: number;
  todayViews: number;
}

const defaultData: SystemReportData = {
  users: 0,
  activeUsers: 0,
  newUsers: 0,
  posts: 0,
  publishedPosts: 0,
  comments: 0,
  pendingComments: 0,
  views: 0,
  todayViews: 0,
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  badges: { label: string; value: number }[];
  accentColor: string;
  delay?: number;
  trend?: number | null;
}

function StatCard({ title, value, icon, badges, accentColor, delay = 0, trend }: StatCardProps) {
  return (
    <div
      className="dash-panel dash-panel--hover group relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient Accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          insetInlineEnd: 0,
          width: '8rem',
          height: '8rem',
          marginInlineEnd: '-2.5rem',
          marginBlockStart: '-2.5rem',
          borderRadius: '50%',
          opacity: 0.15,
          filter: 'blur(24px)',
          background: accentColor,
        }}
      />

      <div style={{ position: 'relative', padding: 'var(--ds-space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBlockEnd: 'var(--ds-space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--ds-space-3)',
              borderRadius: 'var(--ds-radius-md)',
              background: accentColor,
              color: 'oklch(98% 0 0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
          {trend != null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 'var(--ds-text-sm)',
                fontWeight: 500,
                color: trend >= 0 ? 'var(--ds-status-success-fg)' : 'var(--ds-status-error-fg)',
              }}
            >
              <TrendingUp
                style={{
                  width: '1rem',
                  height: '1rem',
                  transform: trend < 0 ? 'rotate(180deg)' : 'none',
                }}
              />
              <span>
                {trend >= 0 ? '+' : ''}
                {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(trend)}٪
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
          <p
            style={{
              fontSize: 'var(--ds-text-sm)',
              fontWeight: 500,
              color: 'var(--ds-text-secondary)',
              margin: 0,
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: 'var(--ds-text-2xl)',
              fontWeight: 700,
              color: 'var(--ds-text-primary)',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value.toLocaleString('fa-IR')}
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--ds-space-2)',
              paddingBlockStart: 'var(--ds-space-2)',
            }}
          >
            {badges.map((badge, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 'var(--ds-space-1) var(--ds-space-3)',
                  borderRadius: 'var(--ds-radius-md)',
                  fontSize: 'var(--ds-text-xs)',
                  fontWeight: 500,
                  background: 'var(--ds-canvas-subtle)',
                  color: 'var(--ds-text-secondary)',
                  border: '1px solid var(--ds-border-subtle)',
                  transition: 'background var(--ds-duration-fast)',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'currentColor',
                    opacity: 0.6,
                  }}
                />
                {badge.value.toLocaleString('fa-IR')} {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Effect Line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          insetInline: 0,
          height: '2px',
          opacity: 0,
          background: accentColor,
          transition: 'opacity var(--ds-duration-fast)',
        }}
        className="group-hover:opacity-100"
      />
    </div>
  );
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--ds-surface-elevated)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-4)',
          boxShadow: 'var(--ds-shadow-lg)',
          border: '1px solid var(--ds-border-subtle)',
        }}
      >
        <p
          style={{
            fontWeight: 600,
            color: 'var(--ds-text-primary)',
            marginBlockEnd: 'var(--ds-space-2)',
            margin: '0 0 8px 0',
          }}
        >
          {label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-1)' }}>
          {payload.map((entry, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'var(--ds-text-sm)',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--ds-text-secondary)' }}>{entry.name}:</span>
              <span
                style={{
                  fontWeight: 500,
                  color: 'var(--ds-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {entry.value?.toLocaleString('fa-IR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function SystemReports() {
  const [data, setData] = useState<SystemReportData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/reports/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('خطا در دانلود فایل');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system-report.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'موفقیت', description: 'گزارش با موفقیت دریافت شد', variant: 'success' });
    } catch {
      toast({ title: 'خطا', description: 'خطا در دانلود فایل', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-reports', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('خطا در دریافت اطلاعات');
      }
      const result = await response.json();
      setData({
        users: result.userStats.total,
        activeUsers: result.userStats.active,
        newUsers: result.userStats.newThisMonth,
        posts: result.postStats.total,
        publishedPosts: result.postStats.published,
        comments: result.commentStats?.total || 0,
        pendingComments: result.commentStats?.pending || 0,
        views: result.viewStats.total,
        todayViews: result.viewStats.today || 0,
      });
    } catch {
      toast({ title: 'خطا', description: 'خطا در دریافت گزارش', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  const chartData = [
    {
      key: 'users',
      name: 'کاربران',
      تعداد: data.users,
      فعال: data.activeUsers,
      جدید: data.newUsers,
    },
    { key: 'posts', name: 'پست‌ها', تعداد: data.posts, منتشرشده: data.publishedPosts },
    { key: 'comments', name: 'نظرات', تعداد: data.comments, درانتظار: data.pendingComments },
    { key: 'views', name: 'بازدیدها', تعداد: data.views, امروز: data.todayViews },
  ];

  // trend: percentage of sub-value relative to total (e.g. active/total users)
  const statCards = [
    {
      title: 'کاربران',
      value: data.users,
      icon: <Users style={{ width: '1.25rem', height: '1.25rem', color: 'oklch(98% 0 0)' }} />,
      badges: [
        { label: 'فعال', value: data.activeUsers },
        { label: 'جدید', value: data.newUsers },
      ],
      accentColor: 'var(--ds-status-progress-fg)',
      trend: data.users > 0 ? Math.round((data.newUsers / data.users) * 100) : null,
    },
    {
      title: 'پست‌ها',
      value: data.posts,
      icon: <FileText style={{ width: '1.25rem', height: '1.25rem', color: 'oklch(98% 0 0)' }} />,
      badges: [{ label: 'منتشر شده', value: data.publishedPosts }],
      accentColor: 'var(--nova-violet)',
      trend: data.posts > 0 ? Math.round((data.publishedPosts / data.posts) * 100) : null,
    },
    {
      title: 'نظرات',
      value: data.comments,
      icon: (
        <MessageSquare style={{ width: '1.25rem', height: '1.25rem', color: 'oklch(98% 0 0)' }} />
      ),
      badges: [{ label: 'در انتظار تأیید', value: data.pendingComments }],
      accentColor: 'var(--ds-accent-amber)',
      trend:
        data.comments > 0
          ? Math.round(((data.comments - data.pendingComments) / data.comments) * 100)
          : null,
    },
    {
      title: 'بازدیدها',
      value: data.views,
      icon: <Eye style={{ width: '1.25rem', height: '1.25rem', color: 'oklch(98% 0 0)' }} />,
      badges: [{ label: 'امروز', value: data.todayViews }],
      accentColor: 'var(--ds-accent-emerald)',
      trend: data.views > 0 ? Math.round((data.todayViews / data.views) * 100) : null,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-8)' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}
        className="sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2
            style={{
              fontSize: 'var(--ds-text-xl)',
              fontWeight: 700,
              color: 'var(--ds-text-primary)',
              margin: 0,
            }}
          >
            نمای کلی آمار
          </h2>
          <p
            style={{
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-secondary)',
              marginBlockStart: 'var(--ds-space-1)',
              margin: '4px 0 0',
            }}
          >
            خلاصه‌ای از وضعیت کلی سیستم
          </p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            background: 'var(--nova-primary)',
            color: 'oklch(98% 0 0)',
            borderRadius: 'var(--ds-radius-md)',
            padding: '0.625rem 1.25rem',
            fontWeight: 500,
            border: 'none',
            cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'opacity var(--ds-duration-fast)',
          }}
        >
          {downloading ? (
            <>
              <Loader2
                style={{
                  width: '1rem',
                  height: '1rem',
                  animation: 'spin 1s linear infinite',
                  marginInlineEnd: '8px',
                }}
                aria-hidden
              />
              در حال دانلود...
            </>
          ) : (
            <>
              <Download
                style={{ width: '1rem', height: '1rem', marginInlineEnd: '8px' }}
                aria-hidden
              />
              دانلود گزارش
            </>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => (
          <StatCard key={card.title} {...card} delay={index * 100} />
        ))}
      </div>

      {/* Chart Section */}
      <div className="dash-panel" style={{ overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            padding: 'var(--ds-space-5)',
            borderBottom: '1px solid var(--ds-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
            <div
              style={{
                padding: 'var(--ds-space-2)',
                borderRadius: 'var(--ds-radius-md)',
                background: 'var(--nova-primary)',
                color: 'oklch(98% 0 0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BarChart3 style={{ width: '1.25rem', height: '1.25rem' }} />
            </div>
            <div>
              <h3
                style={{
                  fontWeight: 600,
                  color: 'var(--ds-text-primary)',
                  margin: 0,
                  fontSize: 'var(--ds-text-base)',
                }}
              >
                نمودار آماری
              </h3>
              <p
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  margin: 0,
                }}
              >
                مقایسه آمار بخش‌های مختلف
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: 'var(--ds-space-5)' }}>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(55% 0.14 265)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(55% 0.14 265)" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(58% 0.12 165)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(58% 0.12 165)" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(68% 0.14 70)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(68% 0.14 70)" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--ds-border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 12 }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'color-mix(in oklch, var(--nova-primary) 5%, transparent)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="تعداد" fill="url(#colorTotal)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="فعال" fill="url(#colorActive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="جدید" fill="url(#colorNew)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="منتشرشده" fill="oklch(58% 0.14 290)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="درانتظار" fill="oklch(55% 0.17 20)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="امروز" fill="oklch(52% 0.14 162)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
