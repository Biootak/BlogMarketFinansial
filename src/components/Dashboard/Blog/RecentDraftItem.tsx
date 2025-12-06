import Link from 'next/link';
import type React from 'react';
import { Calendar, Pencil, User } from 'lucide-react';;;

interface RecentDraftItemProps {
  id: string;
  title: string;
  date: string;
  author: string;
}

const RecentDraftItem: React.FC<RecentDraftItemProps> = ({ id, title, date, author }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-center">
        <h5 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300">
          {title}
        </h5>

        <Link
          href={`/dashboard/posts/edit/${id}`}
          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
        >
          <Pencil className="w-5 h-5" />
        </Link>
      </div>
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center space-x-3 space-x-reverse text-gray-600 dark:text-gray-400">
          <span className="flex items-center">
            <Calendar className="w-4 h-4 ml-1" />
            {date}
          </span>
          <span className="flex items-center">
            <User className="w-4 h-4 ml-1" />
            {author}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecentDraftItem;
