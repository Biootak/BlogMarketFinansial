import type React from 'react';
import Link from 'next/link';
import {
  HiOutlinePencilAlt,
  HiOutlineEye,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineClock,
  HiPencil,
} from 'react-icons/hi';

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
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-0">
            مدیریت پست‌ها
          </h1>
          <Link
            href="/dashboard/posts/create"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full flex items-center transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            <HiOutlinePlus className="w-5 h-5 ml-2" />
            ایجاد پست جدید
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <StatCard
            icon={HiOutlineDocumentText}
            title="کل پست‌ها"
            value={stats.totalPosts}
            color="purple"
          />
          <StatCard
            icon={HiOutlinePencilAlt}
            title="پیش‌نویس‌ها"
            value={stats.totalDrafts}
            color="blue"
          />
          <StatCard icon={HiOutlineEye} title="بازدیدها" value={stats.totalViews} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PopularPosts posts={popularPosts} />
          <RecentDrafts drafts={recentDrafts} />
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: number;
  color: string;
}> = ({ icon: Icon, title, value, color }) => (
  <div
    className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl border-b-4 border-${color}-500 transform hover:-translate-y-1`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-white">
          {value.toLocaleString('fa-IR')}
        </p>
      </div>
      <div className={`bg-${color}-100 dark:bg-${color}-900 p-3 rounded-full`}>
        <Icon className={`w-8 h-8 text-${color}-500`} />
      </div>
    </div>
  </div>
);

const PopularPosts: React.FC<{ posts: PostManagementProps['popularPosts'] }> = ({ posts }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
        <HiOutlineChartBar className="w-6 h-6 ml-2 text-purple-500" />
        پست‌های محبوب
      </h2>
      <Link
        href="/dashboard/posts"
        className="text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center text-sm font-medium transition-colors duration-200"
      >
        مشاهده همه
        <HiOutlineArrowLeft className="w-4 h-4 mr-2" />
      </Link>
    </div>
    <ul className="space-y-4">
      {posts.map((post) => (
        <li
          key={post.id}
          className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0"
        >
          <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md p-3">
            <Link href={`/single/${post.slug}`} className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                {post.title}
              </h3>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {post.author} - {post.publishDate}
                </span>
              </div>
            </Link>
            <Link
              href={`/dashboard/posts/edit/${post.id}`}
              className="mr-4 p-2 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors duration-200"
            >
              <HiPencil className="w-5 h-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const RecentDrafts: React.FC<{ drafts: PostManagementProps['recentDrafts'] }> = ({ drafts }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
        <HiOutlineClock className="w-6 h-6 ml-2 text-blue-500" />
        پیش‌نویس‌های اخیر
      </h2>
      <Link
        href="/dashboard/posts?filter=draft"
        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center text-sm font-medium transition-colors duration-200"
      >
        مشاهده همه
        <HiOutlineArrowLeft className="w-4 h-4 mr-2" />
      </Link>
    </div>
    <ul className="space-y-4">
      {drafts.map((draft) => (
        <li
          key={draft.id}
          className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0"
        >
          <div className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md p-3">
            <Link href={`/dashboard/posts/${draft.id}/edit`} className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                {draft.title}
              </h3>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {draft.author} - {draft.date}
                </span>
              </div>
            </Link>
            <Link
              href={`/dashboard/posts/edit/${draft.id}`}
              className="mr-4 p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200"
            >
              <HiPencil className="w-5 h-5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default PostManagement;
