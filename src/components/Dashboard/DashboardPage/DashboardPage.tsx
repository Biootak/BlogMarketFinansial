import type React from 'react';
import dynamic from 'next/dynamic';

import {
  HiOutlineEye,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineShare,
  HiOutlineHeart,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';

import WelcomeSection from './WelcomeSection/WelcomeSection';
import BlogStatCard from '@/components/Dashboard/DashboardPage/BlogStatCard';
import PostManagement from '../Blog/PostManagement';
import PublishingCalendar from '../Calendar/PublishingCalendar';
import type { PostWithRelations } from '@/types/types';

const TrafficChart = dynamic(() => import('./TrafficChart'), { suspense: true });

interface DashboardPageProps {
  stats: {
    views: { today: number; data: number[] };
    comments: { new: number; data: number[] };
    shares: { total: number; data: number[] };
    likes: { total: number; data: number[] };
    publishedPosts: { total: number; data: number[] };
    drafts: { total: number; data: number[] };
  };
  scheduledPosts: PostWithRelations[];
  popularPosts: Array<{
    id: string;
    title: string;
    views: number;
    publishDate: string;
    author: string;
    slug: string;
  }>;
  recentDrafts: Array<{
    id: string;
    title: string;
    date: string;
    author: string;
  }>;
}

interface Card {
  id: number;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  percentage?: number;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  scheduledPosts,
  popularPosts,
  recentDrafts,
}) => {
  const LABELS = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'];

  const blogStatCards: Card[] = [
    {
      id: 1,
      title: 'بازدیدهای امروز',
      value: stats.views.today,
      icon: <HiOutlineEye className="w-6 h-6" />,
      color: 'blue',
      trend: 'up',
      percentage: 5.2,
    },
    {
      id: 2,
      title: 'نظرات جدید',
      value: stats.comments.new,
      icon: <HiOutlineChatBubbleLeftEllipsis className="w-6 h-6" />,
      color: 'green',
      trend: 'neutral',
      percentage: 0.1,
    },
    {
      id: 3,
      title: 'اشتراک‌گذاری‌ها',
      value: stats.shares.total,
      icon: <HiOutlineShare className="w-6 h-6" />,
      color: 'purple',
      trend: 'up',
      percentage: 12.3,
    },
    {
      id: 4,
      title: 'لایک‌ها',
      value: stats.likes.total,
      icon: <HiOutlineHeart className="w-6 h-6" />,
      color: 'red',
      trend: 'down',
      percentage: 2.5,
    },
    {
      id: 5,
      title: 'پست‌های منتشر شده',
      value: stats.publishedPosts.total,
      icon: <HiOutlineDocumentText className="w-6 h-6" />,
      color: 'orange',
      trend: 'up',
      percentage: 10.5,
    },
    {
      id: 6,
      title: 'پیش‌نویس‌ها',
      value: stats.drafts.total,
      icon: <HiOutlinePencilSquare className="w-6 h-6" />,
      color: 'blue',
      trend: 'neutral',
      percentage: 1,
    },
  ];

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 space-y-6 min-h-screen" dir="rtl">
      <WelcomeSection />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {blogStatCards.map((card) => (
          <BlogStatCard
            key={card.id}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            trend={card.trend}
            percentage={card.percentage}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <TrafficChart data={stats.views.data} labels={LABELS} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <PublishingCalendar scheduledPosts={scheduledPosts} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <PostManagement
          stats={{
            totalPosts: stats.publishedPosts.total + stats.drafts.total,
            totalDrafts: stats.drafts.total,
            totalViews: stats.views.data.reduce((a, b) => a + b, 0),
          }}
          popularPosts={popularPosts}
          recentDrafts={recentDrafts}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
