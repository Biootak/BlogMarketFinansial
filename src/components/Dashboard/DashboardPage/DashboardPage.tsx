'use client';

import type React from 'react';
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
import TrafficChart from './TrafficChart';
import type { PostWithRelations } from '@/types/types';

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
  recentDrafts: Array<{ id: string; title: string; date: string; author: string }>;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  scheduledPosts,
  popularPosts,
  recentDrafts,
}) => {
  const LABELS = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'];

  const blogStatCards = [
    {
      title: 'بازدیدهای امروز',
      value: stats.views.today,
      icon: HiOutlineEye,
      color: 'blue' as const,
      trend: 'up' as const,
      percentage: 5.2,
    },
    {
      title: 'نظرات جدید',
      value: stats.comments.new,
      icon: HiOutlineChatBubbleLeftEllipsis,
      color: 'green' as const,
      trend: 'neutral' as const,
      percentage: 0.1,
    },
    {
      title: 'اشتراک‌گذاری‌ها',
      value: stats.shares.total,
      icon: HiOutlineShare,
      color: 'purple' as const,
      trend: 'up' as const,
      percentage: 12.3,
    },
    {
      title: 'لایک‌ها',
      value: stats.likes.total,
      icon: HiOutlineHeart,
      color: 'red' as const,
      trend: 'down' as const,
      percentage: 2.5,
    },
    {
      title: 'پست‌های منتشر شده',
      value: stats.publishedPosts.total,
      icon: HiOutlineDocumentText,
      color: 'orange' as const,
      trend: 'up' as const,
      percentage: 10.5,
    },
    {
      title: 'پیش‌نویس‌ها',
      value: stats.drafts.total,
      icon: HiOutlinePencilSquare,
      color: 'blue' as const,
      trend: 'neutral' as const,
      percentage: 1,
    },
  ];

  return (
    <div
      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen"
      dir="rtl"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WelcomeSection />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-8">
          {blogStatCards.map((card) => (
            <BlogStatCard
              key={card.value}
              title={card.title}
              value={card.value}
              icon={<card.icon className="w-6 h-6" />}
              color={card.color}
              trend={card.trend}
              percentage={card.percentage}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              آمار بازدید
            </h2>
            <TrafficChart data={stats.views.data} labels={LABELS} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              تقویم انتشار
            </h2>
            <PublishingCalendar scheduledPosts={scheduledPosts} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mt-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            مدیریت پست‌ها
          </h2>
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
    </div>
  );
};

export default DashboardPage;
