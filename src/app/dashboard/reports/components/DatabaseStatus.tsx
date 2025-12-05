'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatabaseStats {
  counts: {
    users: number;
    posts: number;
    publishedPosts: number;
    views: number;
    likes: number;
    comments: number;
    savedPosts: number;
  };
  status: 'EMPTY_DATABASE' | 'NO_ENGAGEMENT_DATA' | 'HAS_DATA';
  message: string;
}

export function DatabaseStatus() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/debug/check-data');
      if (!response.ok) {
        throw new Error('خطا در دریافت اطلاعات');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-sm text-blue-700">در حال بررسی وضعیت دیتابیس...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-900 mb-1">خطا در بررسی دیتابیس</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const isEmptyDatabase = stats.status === 'EMPTY_DATABASE';
  const noEngagement = stats.status === 'NO_ENGAGEMENT_DATA';
  const hasData = stats.status === 'HAS_DATA';

  return (
    <div
      className={cn(
        'border rounded-xl p-4',
        isEmptyDatabase && 'bg-red-50 border-red-200',
        noEngagement && 'bg-amber-50 border-amber-200',
        hasData && 'bg-emerald-50 border-emerald-200'
      )}
    >
      <div className="flex items-start gap-3">
        {isEmptyDatabase && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
        {noEngagement && <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
        {hasData && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4
              className={cn(
                'text-sm font-semibold',
                isEmptyDatabase && 'text-red-900',
                noEngagement && 'text-amber-900',
                hasData && 'text-emerald-900'
              )}
            >
              <Database className="w-4 h-4 inline-block ml-1" />
              وضعیت دیتابیس
            </h4>
            <button
              type="button"
              onClick={fetchStats}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              بروزرسانی
            </button>
          </div>

          <p
            className={cn(
              'text-sm mb-3',
              isEmptyDatabase && 'text-red-700',
              noEngagement && 'text-amber-700',
              hasData && 'text-emerald-700'
            )}
          >
            {stats.message}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/50 rounded-lg p-2">
              <div className="text-gray-600">کاربران</div>
              <div className="font-bold text-gray-900">{stats.counts.users.toLocaleString('fa-IR')}</div>
            </div>
            <div className="bg-white/50 rounded-lg p-2">
              <div className="text-gray-600">پست‌ها</div>
              <div className="font-bold text-gray-900">{stats.counts.posts.toLocaleString('fa-IR')}</div>
            </div>
            <div className="bg-white/50 rounded-lg p-2">
              <div className="text-gray-600">بازدیدها</div>
              <div className="font-bold text-gray-900">{stats.counts.views.toLocaleString('fa-IR')}</div>
            </div>
            <div className="bg-white/50 rounded-lg p-2">
              <div className="text-gray-600">تعاملات</div>
              <div className="font-bold text-gray-900">
                {(stats.counts.likes + stats.counts.comments + stats.counts.savedPosts).toLocaleString('fa-IR')}
              </div>
            </div>
          </div>

          {isEmptyDatabase && (
            <div className="mt-3 text-xs text-red-700 bg-red-100 rounded-lg p-2">
              💡 برای نمایش آمار، ابتدا باید کاربران و پست‌ها را در سیستم ایجاد کنید.
            </div>
          )}

          {noEngagement && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-100 rounded-lg p-2">
              💡 پست‌ها وجود دارند اما بازدید و تعاملات ثبت نشده است. برای ثبت بازدید، پست‌ها را در سایت مشاهده کنید.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
