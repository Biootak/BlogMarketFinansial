'use client';

import type { TopAuthor } from '@/actions/reportActions';
import { Award, Eye, FileText, TrendingUp } from 'lucide-react';

interface TopAuthorsTableProps {
  data: TopAuthor[];
  isLoading?: boolean;
}

export function TopAuthorsTable({ data, isLoading = false }: TopAuthorsTableProps) {
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
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">نویسندگان برتر</h3>
            <p className="text-sm text-gray-500">پرکارترین نویسندگان</p>
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
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg sm:rounded-xl flex-shrink-0">
          <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">نویسندگان برتر</h3>
          <p className="text-xs sm:text-sm text-gray-500 truncate">پرکارترین نویسندگان</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">رتبه</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">
                نام نویسنده
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">
                تعداد پست
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">
                کل بازدید
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600">
                میانگین بازدید
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((author, index) => (
              <tr
                key={author.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                      index === 0
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                        : index === 1
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                          : index === 2
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{author.name || 'ناشناس'}</p>
                    <p className="text-xs text-gray-500">{author.email}</p>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {author.postCount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {author.totalViews.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-700">
                      {author.averageViews.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 sm:space-y-4">
        {data.map((author, index) => (
          <div
            key={author.id}
            className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200"
          >
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white text-xs sm:text-sm font-bold flex-shrink-0 ${
                  index === 0
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                    : index === 1
                      ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                      : index === 2
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-1 truncate">
                  {author.name || 'ناشناس'}
                </h4>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{author.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center p-1.5 sm:p-2 bg-white rounded-md sm:rounded-lg">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">پست</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                  {author.postCount.toLocaleString('fa-IR')}
                </p>
              </div>
              <div className="text-center p-1.5 sm:p-2 bg-white rounded-md sm:rounded-lg">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">
                  بازدید
                </p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                  {author.totalViews.toLocaleString('fa-IR')}
                </p>
              </div>
              <div className="text-center p-1.5 sm:p-2 bg-white rounded-md sm:rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">
                  میانگین
                </p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                  {author.averageViews.toLocaleString('fa-IR')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل نویسندگان</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {data.length.toLocaleString('fa-IR')}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل پست‌ها</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {data.reduce((sum, author) => sum + author.postCount, 0).toLocaleString('fa-IR')}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">کل بازدیدها</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {data.reduce((sum, author) => sum + author.totalViews, 0).toLocaleString('fa-IR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
