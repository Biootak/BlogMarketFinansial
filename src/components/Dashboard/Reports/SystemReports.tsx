'use client';

import { useEffect, useState } from 'react';
import { getSystemReports } from '@/actions/reportActions';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function SystemReports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSystemReports();
        if (result.success) {
          setData(result.data);
        } else {
          toast({
            variant: "destructive",
            title: "خطا",
            description: result.message || "خطا در دریافت گزارش‌های سیستم"
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطا",
          description: error instanceof Error ? error.message : "خطا در دریافت گزارش‌های سیستم"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-500">خطا در دریافت گزارش‌های سیستم</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
        <h4 className="font-medium text-[rgb(var(--c-primary-600))]">آمار کاربران</h4>
        <div className="mt-2 space-y-1">
          <p>تعداد کل: {data.userStats.total}</p>
          <p>کاربران جدید این ماه: {data.userStats.newThisMonth}</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
        <h4 className="font-medium text-[rgb(var(--c-primary-600))]">آمار مطالب</h4>
        <div className="mt-2 space-y-1">
          <p>تعداد کل: {data.postStats.total}</p>
          <p>منتشر شده: {data.postStats.published}</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
        <h4 className="font-medium text-[rgb(var(--c-primary-600))]">آمار نظرات</h4>
        <div className="mt-2 space-y-1">
          <p>تعداد کل: {data.commentStats.total}</p>
          <p>در انتظار تایید: {data.commentStats.pending}</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
        <h4 className="font-medium text-[rgb(var(--c-primary-600))]">آمار بازدید</h4>
        <div className="mt-2 space-y-1">
          <p>تعداد کل: {data.viewStats.total}</p>
          <p>امروز: {data.viewStats.today}</p>
        </div>
      </div>
    </div>
  );
}
