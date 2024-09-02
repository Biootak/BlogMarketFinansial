'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  viewStats: {
    labels: string[];
    data: number[];
    totalViews: number;
    todayViews: number;
  };
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  scheduledPosts,
  popularPosts,
  recentDrafts,
  viewStats,
}) => {
  const blogStatCards = useMemo(
    () =>
      [
        {
          title: 'بازدیدهای امروز',
          value: viewStats.todayViews,
          icon: <HiOutlineEye className="w-6 h-6" />,
          color: 'blue',
          trend: 'up',
          percentage: 5.2,
        },
        {
          title: 'نظرات جدید',
          value: stats.comments.new,
          icon: <HiOutlineChatBubbleLeftEllipsis className="w-6 h-6" />,
          color: 'green',
          trend: 'neutral',
          percentage: 0.1,
        },
        {
          title: 'اشتراک‌گذاری‌ها',
          value: stats.shares.total,
          icon: <HiOutlineShare className="w-6 h-6" />,
          color: 'purple',
          trend: 'up',
          percentage: 12.3,
        },
        {
          title: 'لایک‌ها',
          value: stats.likes.total,
          icon: <HiOutlineHeart className="w-6 h-6" />,
          color: 'red',
          trend: 'down',
          percentage: 2.5,
        },
        {
          title: 'پست‌های منتشر شده',
          value: stats.publishedPosts.total,
          icon: <HiOutlineDocumentText className="w-6 h-6" />,
          color: 'orange',
          trend: 'up',
          percentage: 10.5,
        },
        {
          title: 'پیش‌نویس‌ها',
          value: stats.drafts.total,
          icon: <HiOutlinePencilSquare className="w-6 h-6" />,
          color: 'blue',
          trend: 'neutral',
          percentage: 1,
        },
      ] as const,
    [stats, viewStats],
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 space-y-8 bg-neutral-50 dark:bg-neutral-900"
    >
      <WelcomeSection />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blogStatCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <BlogStatCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
              percentage={card.percentage}
              detailedInfo={
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  اطلاعات بیشتر درباره {card.title}
                </p>
              }
            />
          </motion.div>
        ))}
      </div>

      <Tabs dir="rtl" defaultValue="traffic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <TabsTrigger
            value="traffic"
            className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary-900 dark:data-[state=active]:bg-primary-900 dark:data-[state=active]:text-primary-100"
          >
            آمار بازدید
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary-900 dark:data-[state=active]:bg-primary-900 dark:data-[state=active]:text-primary-100"
          >
            تقویم انتشار
          </TabsTrigger>
        </TabsList>
        <TabsContent value="traffic">
          <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardHeader>
              <CardTitle className="text-primary-900 dark:text-primary-100">آمار بازدید</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <TrafficChart data={viewStats.data} labels={viewStats.labels} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardHeader>
              <CardTitle className="text-primary-900 dark:text-primary-100">تقویم انتشار</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <PublishingCalendar scheduledPosts={scheduledPosts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PostManagement
        stats={{
          totalPosts: stats.publishedPosts.total + stats.drafts.total,
          totalDrafts: stats.drafts.total,
          totalViews: viewStats.totalViews,
        }}
        popularPosts={popularPosts}
        recentDrafts={recentDrafts}
      />
    </motion.main>
  );
};

export default React.memo(DashboardPage);
