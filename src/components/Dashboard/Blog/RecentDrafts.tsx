import type React from 'react';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi2';
import RecentDraftItem from './RecentDraftItem';


interface Draft {
  id: string;
  title: string;
  date: string;
  author: string;
}

interface RecentDraftsProps {
  drafts: Draft[];
}

const RecentDrafts: React.FC<RecentDraftsProps> = ({ drafts }) => {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-xl dark:text-white">پیش‌نویس‌های اخیر</h4>
        <Link
          href="/dashboard/admin/posts"
          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center text-sm font-medium transition-colors duration-200"
        >
          مشاهده همه
          <HiArrowLeft className="w-4 h-4 mr-2" />
        </Link>
      </div>
      <div className="space-y-4">
        {drafts.length > 0 ? (
          drafts.map((draft) => <RecentDraftItem key={draft.id} {...draft} />)
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">
            هیچ پیش‌نویسی یافت نشد.
          </p>
        )}
      </div>
    </div>
  );
};

export default RecentDrafts;
