import type React from 'react';
import Link from 'next/link';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import PopularPostItem from './PopularPostItem';


interface PopularPost {
  id: string;
  title: string;
  views: number;
  publishDate: string;
  author: string;
  slug: string;
}

interface PopularPostsProps {
  posts: PopularPost[];
}

const PopularPosts: React.FC<PopularPostsProps> = ({ posts }) => {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-xl dark:text-white">پست‌های محبوب</h4>
        <Link
          href="/dashboard/posts"
          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center text-sm font-medium transition-colors duration-200"
        >
          مشاهده همه
          <HiOutlineArrowLeft className="w-4 h-4 mr-2" />
        </Link>
      </div>
      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PopularPostItem key={post.id} {...post} />
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">هیچ پست محبوبی یافت نشد.</p>
        )}
      </div>
    </div>
  );
};

export default PopularPosts;