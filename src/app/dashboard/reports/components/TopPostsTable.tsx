'use client';

import type { TopPost } from '@/actions/reportActions';
import { Bookmark, ExternalLink, Eye, FileText, Heart, MessageSquare } from 'lucide-react';;;
import Link from 'next/link';

interface TopPostsTableProps {
  data: TopPost[];
  isLoading?: boolean;
}

export function TopPostsTable({ data, isLoading = false }: TopPostsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 animate-pulse">
        <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3 mb-4 sm:mb-6" />
        <div className="space-y-3 sm:space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 sm:h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">پست‌های برتر</h3>
            <p className="text-sm text-gray-500">پرمخاطب‌ترین پست‌ها</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-40 text-gray-400">
          <p>داده‌ای برای نمایش وجود ندارد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex-shrink-0">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">پست‌های برتر</h3>
          <p className="text-xs sm:text-sm text-gray-500 truncate">پرمخاطب‌ترین پست‌ها</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">رتبه</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">
                عنوان پست
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">نویسنده</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">بازدید</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">لایک</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">نظر</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">ذخیره</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {data.map((post, index) => (
              <tr
                key={post.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="max-w-md">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{post.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('fa-IR')
                        : '-'}
                    </p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <p className="text-sm text-gray-700">{post.author.name || 'ناشناس'}</p>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {post.views.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700">
                      {post.likes.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-700">
                      {post.comments.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-700">
                      {post.saves.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <Link
                    href={`/single/${post.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    مشاهده
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 sm:space-y-4">
        {data.map((post, index) => (
          <div
            key={post.id}
            className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200"
          >
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs sm:text-sm font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 mb-0.5 sm:mb-1">
                  {post.title}
                </h4>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {post.author.name || 'ناشناس'} •{' '}
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fa-IR') : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="text-center">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs font-semibold text-gray-900 truncate">
                  {post.views.toLocaleString('fa-IR')}
                </p>
              </div>
              <div className="text-center">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-gray-700 truncate">
                  {post.likes.toLocaleString('fa-IR')}
                </p>
              </div>
              <div className="text-center">
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-gray-700 truncate">
                  {post.comments.toLocaleString('fa-IR')}
                </p>
              </div>
              <div className="text-center">
                <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-gray-700 truncate">
                  {post.saves.toLocaleString('fa-IR')}
                </p>
              </div>
            </div>

            <Link
              href={`/single/${post.slug}`}
              target="_blank"
              className="flex items-center justify-center gap-1 w-full py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors"
            >
              مشاهده پست
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
