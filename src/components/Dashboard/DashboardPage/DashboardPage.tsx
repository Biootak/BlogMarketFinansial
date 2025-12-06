'use client';

import BlogStatCard from '@/components/Dashboard/DashboardPage/BlogStatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PostWithRelations } from '@/types/types';
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import {
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineHeart,
  HiOutlinePencilSquare,
  HiOutlineShare,
} from 'react-icons/hi2';
import useSWR from 'swr';
import PostManagement from '../Blog/PostManagement';
import PublishingCalendar from '../Calendar/PublishingCalendar';
import TrafficChart from './TrafficChart';
import WelcomeSection from './WelcomeSection/WelcomeSection';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const DashboardPage: React.FC<DashboardPageProps> = ({
  stats: initialStats,
  scheduledPosts: initialScheduledPosts,
  popularPosts: initialPopularPosts,
  recentDrafts: initialRecentDrafts,
  viewStats: initialViewStats,
}) => {
  const { data: stats } = useSWR('/api/dashboard/stats', {
    fallbackData: initialStats,
    revalidateOnFocus: true,
  });
  const { data: scheduledPosts } = useSWR('/api/dashboard/scheduled-posts', {
    fallbackData: initialScheduledPosts,
  });
  const { data: popularPosts } = useSWR('/api/dashboard/popular-posts', {
    fallbackData: initialPopularPosts,
  });
  const { data: recentDrafts } = useSWR('/api/dashboard/recent-drafts', {
    fallbackData: initialRecentDrafts,
  });
  const { data: viewStats } = useSWR('/api/dashboard/view-stats', {
    fallbackData: initialViewStats,
  });

  const blogStatCards = useMemo(
    () =>
      [
        {
          title: 'بازدیدهای امروز',
          value: viewStats.todayViews,
          icon: <HiOutlineEye className="w-5 h-5" />,
          color: 'blue',
          trend: 'up',
          percentage: 5.2,
        },
        {
          title: 'نظرات جدید',
          value: stats.comments.new,
          icon: <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" />,
          color: 'green',
          trend: 'neutral',
          percentage: 0.1,
        },
        {
          title: 'اشتراک‌گذاری‌ها',
          value: stats.shares.total,
          icon: <HiOutlineShare className="w-5 h-5" />,
          color: 'purple',
          trend: 'up',
          percentage: 12.3,
        },
        {
          title: 'لایک‌ها',
          value: stats.likes.total,
          icon: <HiOutlineHeart className="w-5 h-5" />,
          color: 'red',
          trend: 'down',
          percentage: 2.5,
        },
        {
          title: 'پست‌های منتشر شده',
          value: stats.publishedPosts.total,
          icon: <HiOutlineDocumentText className="w-5 h-5" />,
          color: 'orange',
          trend: 'up',
          percentage: 10.5,
        },
        {
          title: 'پیش‌نویس‌ها',
          value: stats.drafts.total,
          icon: <HiOutlinePencilSquare className="w-5 h-5" />,
          color: 'blue',
          trend: 'neutral',
          percentage: 1,
        },
      ] as const,
    [stats, viewStats],
  );

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen py-4 sm:py-6 lg:py-8 px-3 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-6 lg:space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants}>
        <WelcomeSection />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
      >
        {blogStatCards.map((card, index) => (
          <motion.div key={card.title} variants={itemVariants} custom={index}>
            <BlogStatCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
              percentage={card.percentage}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs Section */}
      <motion.div variants={itemVariants}>
        <Tabs dir="rtl" defaultValue="traffic" className="w-full">
          <TabsList className="inline-flex p-1 sm:p-1.5 gap-1 sm:gap-1.5 mb-4 sm:mb-6 lg:mb-8 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 overflow-x-auto w-full sm:w-auto">
            <TabsTrigger
              value="traffic"
              className="px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30
                         text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
                         hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5">
                <HiOutlineChartBar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">آمار بازدید</span>
                <span className="xs:hidden">آمار</span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap
                         data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 
                         data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30
                         text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
                         hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5">
                <HiOutlineCalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">تقویم انتشار</span>
                <span className="xs:hidden">تقویم</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="traffic" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              style={{
                boxShadow: `
                  0 0 0 1px rgba(0,0,0,0.03),
                  0 4px 6px rgba(0,0,0,0.02),
                  0 12px 24px rgba(0,0,0,0.04),
                  0 24px 48px rgba(0,0,0,0.04)
                `,
              }}
            >
              {/* Header */}
              <div className="px-4 sm:px-5 md:px-6 lg:px-7 py-4 sm:py-5 md:py-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl sm:rounded-2xl blur-lg opacity-40" />
                    <div className="relative p-2 sm:p-2.5 md:p-3 lg:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl">
                      <HiOutlineChartBar className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
                      آمار بازدید
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                      نمودار بازدید سایت در روزهای اخیر
                    </p>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="p-3 sm:p-4 md:p-5 lg:p-7">
                <div className="h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
                  <TrafficChart />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              style={{
                boxShadow: `
                  0 0 0 1px rgba(0,0,0,0.03),
                  0 4px 6px rgba(0,0,0,0.02),
                  0 12px 24px rgba(0,0,0,0.04),
                  0 24px 48px rgba(0,0,0,0.04)
                `,
              }}
            >
              {/* Header */}
              <div className="px-4 sm:px-5 md:px-6 lg:px-7 py-4 sm:py-5 md:py-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl blur-lg opacity-40" />
                    <div className="relative p-2 sm:p-2.5 md:p-3 lg:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
                      <HiOutlineCalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
                      تقویم انتشار
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                      برنامه‌ریزی انتشار پست‌های آینده
                    </p>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <div className="p-3 sm:p-4 md:p-5 lg:p-7">
                <div className="h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
                  <PublishingCalendar scheduledPosts={scheduledPosts} />
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Post Management */}
      <motion.div variants={itemVariants}>
        <PostManagement
          stats={{
            totalPosts: stats.publishedPosts.total + stats.drafts.total,
            totalDrafts: stats.drafts.total,
            totalViews: viewStats.totalViews,
          }}
          popularPosts={popularPosts}
          recentDrafts={recentDrafts}
        />
      </motion.div>
    </motion.main>
  );
};

export default memo(DashboardPage);
