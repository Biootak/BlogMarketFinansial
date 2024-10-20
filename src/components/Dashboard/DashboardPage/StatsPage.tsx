import type React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';


interface StatsPageProps {
  viewStats: {
    data: number[];
    labels: string[];
  };
  scheduledPosts: Array<{
    id: string;
    title: string;
    date: string;
  }>;
}

const StatsPage: React.FC<StatsPageProps> = ({ viewStats, scheduledPosts }) => {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="traffic" dir="rtl" className="w-full">
        <TabsList className="flex space-x-2 space-x-reverse mb-6 bg-transparent">
          <TabsTrigger
            value="traffic"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50
                       data-[state=active]:bg-primary-100 data-[state=active]:text-primary-900
                       dark:data-[state=active]:bg-primary-900 dark:data-[state=active]:text-primary-100
                       bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300
                       hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            آمار بازدید
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50
                       data-[state=active]:bg-primary-100 data-[state=active]:text-primary-900
                       dark:data-[state=active]:bg-primary-900 dark:data-[state=active]:text-primary-100
                       bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300
                       hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            تقویم انتشار
          </TabsTrigger>
        </TabsList>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg overflow-hidden"
        >
          <TabsContent value="traffic" className="p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">آمار بازدید</h2>
            <div className="h-[400px]">
              <TrafficChart data={viewStats.data} labels={viewStats.labels} />
            </div>
          </TabsContent>
          <TabsContent value="calendar" className="p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">تقویم انتشار</h2>
            <div className="h-[400px]">
              <PublishingCalendar scheduledPosts={scheduledPosts} />
            </div>
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
};

export default StatsPage;