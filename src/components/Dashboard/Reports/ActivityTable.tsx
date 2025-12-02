'use client';

import type { ActivityLog } from '@/actions/reports/activityLogs';
import { Button } from "@/components/ui/button";

interface ActivityTableProps {
  activities: ActivityLog[];
  loading: boolean;
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function ActivityTable({
  activities,
  loading,
  page,
  total,
  limit,
  onPageChange
}: ActivityTableProps) {
  if (loading) {
    return null; // Parent component handles loading state
  }

  return (
    <>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">کاربر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">عملیات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">جزئیات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">زمان</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.user.name || activity.user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {activity.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.DateTimeFormat('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(activity.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">
          نمایش {(page - 1) * limit + 1} تا {Math.min(page * limit, total)} از {total} مورد
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            قبلی
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page * limit >= total}
          >
            بعدی
          </Button>
        </div>
      </div>
    </>
  );
}
