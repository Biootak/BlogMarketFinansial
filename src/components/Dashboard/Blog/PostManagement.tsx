import type React from 'react';
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlineChartBar,
} from 'react-icons/hi2';
import Link from 'next/link';
import PopularPosts from '@/components/Dashboard/Blog/PopularPosts';
import RecentDrafts from '@/components/Dashboard/Blog/RecentDrafts';

interface PostManagementProps {
  stats: {
    totalPosts: number;
    totalDrafts: number;
    totalViews: number;
  };
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

const PostManagement: React.FC<PostManagementProps> = ({ stats, popularPosts, recentDrafts }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 rtl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold dark:text-white flex items-center">
          <HiOutlineDocumentText className="w-8 h-8 ml-3 text-purple-600 dark:text-purple-400" />
          مدیریت پست‌ها
        </h3>
        <Link
          href="/dashboard/admin/posts"
          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center transition-colors duration-200"
        >
          مشاهده همه پست‌ها
          <HiOutlineArrowLeft className="w-5 h-5 mr-2" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-purple-100 dark:bg-purple-900/50 p-6 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
          <p className="text-purple-800 dark:text-purple-200 text-lg mb-2">کل پست‌ها</p>
          <p className="text-4xl font-bold text-purple-600 dark:text-purple-300">
            {stats.totalPosts.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/50 p-6 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
          <p className="text-blue-800 dark:text-blue-200 text-lg mb-2">پیش‌نویس‌ها</p>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-300">
            {stats.totalDrafts.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="bg-green-100 dark:bg-green-900/50 p-6 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
          <p className="text-green-800 dark:text-green-200 text-lg mb-2">بازدیدها</p>
          <p className="text-4xl font-bold text-green-600 dark:text-green-300">
            {stats.totalViews.toLocaleString('fa-IR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PopularPosts posts={popularPosts} />
        <RecentDrafts drafts={recentDrafts} />
      </div>
    </div>
  );
};

export default PostManagement;
