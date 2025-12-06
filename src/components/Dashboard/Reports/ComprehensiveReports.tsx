'use client';

import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Activity,
  Award,
  BarChart3,
  Bookmark,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Globe,
  Heart,
  MessageSquare,
  Monitor,
  Share2,
  Smartphone,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';

interface ComprehensiveData {
  // KPIs
  kpis: {
    totalUsers: number;
    userGrowth: number;
    totalPosts: number;
    postGrowth: number;
    totalViews: number;
    viewGrowth: number;
    engagementRate: number;
    avgReadTime: number;
  };

  // Content Stats
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
  }>;

  topAuthors: Array<{
    id: string;
    name: string;
    posts: number;
    views: number;
  }>;

  categoryStats: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;

  // User Stats
  userActivity: {
    dau: number;
    mau: number;
    returnRate: number;
  };

  deviceStats: Array<{
    name: string;
    value: number;
  }>;

  // Engagement
  engagement: {
    comments: number;
    likes: number;
    shares: number;
    saves: number;
  };

  // Trends
  viewsTrend: Array<{
    date: string;
    views: number;
    users: number;
  }>;

  contentTrend: Array<{
    date: string;
    posts: number;
    comments: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ComprehensiveReports() {
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    // TODO: Fetch real data from API
    // For now, using mock data
    setData({
      kpis: {
        totalUsers: 1250,
        userGrowth: 12.5,
        totalPosts: 342,
        postGrowth: 8.3,
        totalViews: 45680,
        viewGrowth: 15.7,
        engagementRate: 4.2,
        avgReadTime: 3.5,
      },
      topPosts: [
        { id: '1', title: 'تحلیل بازار ارز دیجیتال', views: 5420, engagement: 8.5 },
        { id: '2', title: 'پیش‌بینی قیمت طلا', views: 4890, engagement: 7.2 },
        { id: '3', title: 'راهنمای سرمایه‌گذاری', views: 4320, engagement: 6.8 },
      ],
      topAuthors: [
        { id: '1', name: 'علی محمدی', posts: 45, views: 12500 },
        { id: '2', name: 'سارا احمدی', posts: 38, views: 10200 },
        { id: '3', name: 'رضا کریمی', posts: 32, views: 8900 },
      ],
      categoryStats: [
        { name: 'ارز دیجیتال', count: 120, percentage: 35 },
        { name: 'بورس', count: 95, percentage: 28 },
        { name: 'طلا و سکه', count: 78, percentage: 23 },
        { name: 'سایر', count: 49, percentage: 14 },
      ],
      userActivity: {
        dau: 450,
        mau: 1250,
        returnRate: 68,
      },
      deviceStats: [
        { name: 'موبایل', value: 65 },
        { name: 'دسکتاپ', value: 30 },
        { name: 'تبلت', value: 5 },
      ],
      engagement: {
        comments: 2340,
        likes: 8920,
        shares: 1560,
        saves: 3240,
      },
      viewsTrend: [
        { date: '۱ آذر', views: 1200, users: 380 },
        { date: '۸ آذر', views: 1450, users: 420 },
        { date: '۱۵ آذر', views: 1680, users: 480 },
        { date: '۲۲ آذر', views: 1920, users: 520 },
        { date: '۲۹ آذر', views: 2150, users: 580 },
      ],
      contentTrend: [
        { date: '۱ آذر', posts: 12, comments: 45 },
        { date: '۸ آذر', posts: 15, comments: 58 },
        { date: '۱۵ آذر', posts: 18, comments: 72 },
        { date: '۲۲ آذر', posts: 14, comments: 65 },
        { date: '۲۹ آذر', posts: 20, comments: 89 },
      ],
    });
    setLoading(false);
  }, [timeRange]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">در حال بارگذاری گزارش‌های جامع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">گزارش‌های جامع</h2>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                timeRange === range
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {range === '7d' ? '۷ روز' : range === '30d' ? '۳۰ روز' : '۹۰ روز'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KPICard
          title="کاربران"
          value={data.kpis.totalUsers}
          growth={data.kpis.userGrowth}
          icon={<Users className="w-5 h-5" />}
          gradient="from-blue-500 to-indigo-600"
        />
        <KPICard
          title="پست‌ها"
          value={data.kpis.totalPosts}
          growth={data.kpis.postGrowth}
          icon={<FileText className="w-5 h-5" />}
          gradient="from-violet-500 to-purple-600"
        />
        <KPICard
          title="بازدیدها"
          value={data.kpis.totalViews}
          growth={data.kpis.viewGrowth}
          icon={<Eye className="w-5 h-5" />}
          gradient="from-emerald-500 to-teal-600"
        />
        <KPICard
          title="نرخ تعامل"
          value={data.kpis.engagementRate}
          growth={2.1}
          icon={<Activity className="w-5 h-5" />}
          gradient="from-amber-500 to-orange-600"
          suffix="%"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Trend */}
        <ChartCard title="روند بازدیدها" icon={<TrendingUp className="w-5 h-5" />}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.viewsTrend}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorViews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title="توزیع دسته‌بندی‌ها" icon={<BarChart3 className="w-5 h-5" />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.categoryStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name} (${entry.percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.categoryStats.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <EngagementCard
          title="نظرات"
          value={data.engagement.comments}
          icon={<MessageSquare className="w-5 h-5" />}
          color="blue"
        />
        <EngagementCard
          title="لایک‌ها"
          value={data.engagement.likes}
          icon={<Heart className="w-5 h-5" />}
          color="red"
        />
        <EngagementCard
          title="اشتراک‌ها"
          value={data.engagement.shares}
          icon={<Share2 className="w-5 h-5" />}
          color="green"
        />
        <EngagementCard
          title="ذخیره‌ها"
          value={data.engagement.saves}
          icon={<Bookmark className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            پست‌های برتر
          </h3>
          <div className="space-y-3">
            {data.topPosts.map((post, idx) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full gradient-warning-br flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{post.title}</p>
                    <p className="text-xs text-gray-500">
                      {post.views.toLocaleString('fa-IR')} بازدید
                    </p>
                  </div>
                </div>
                <div className="text-emerald-600 font-bold text-sm">{post.engagement}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Authors */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            نویسندگان برتر
          </h3>
          <div className="space-y-3">
            {data.topAuthors.map((author, idx) => (
              <div
                key={author.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full gradient-primary-br flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{author.name}</p>
                    <p className="text-xs text-gray-500">
                      {author.posts} پست • {author.views.toLocaleString('fa-IR')} بازدید
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  growth,
  icon,
  gradient,
  suffix = '',
}: {
  title: string;
  value: number;
  growth: number;
  icon: React.ReactNode;
  gradient: string;
  suffix?: string;
}) {
  const isPositive = growth >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl text-white shadow-lg bg-gradient-to-br', gradient)}>
          {icon}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-bold',
            isPositive ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(growth).toFixed(1)}%
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-black text-gray-900">
        {value.toLocaleString('fa-IR')}
        {suffix}
      </p>
    </div>
  );
}

// Chart Card Component
function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

// Engagement Card Component
function EngagementCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
    green: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-violet-600',
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-md hover:shadow-lg transition-shadow">
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3 bg-gradient-to-br',
          colorClasses[color],
        )}
      >
        {icon}
      </div>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fa-IR')}</p>
    </div>
  );
}
