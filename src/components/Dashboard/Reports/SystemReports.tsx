'use client';

import { useEffect, useState } from 'react';
import { getSystemReports } from '@/actions/reportActions';
import { Loader2, Download, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { addDays } from 'date-fns';

export default function SystemReports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSystemReports(dateRange.from, dateRange.to);
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
  }, [dateRange]);

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/reports/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dateRange),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-report-${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "خطا در دانلود گزارش"
      });
    }
  };

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

  const chartData = [
    { name: 'کاربران', مقدار: data.userStats.total },
    { name: 'مطالب', مقدار: data.postStats.total },
    { name: 'نظرات', مقدار: data.commentStats.total },
    { name: 'بازدید', مقدار: data.viewStats.total },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <DatePickerWithRange 
          date={dateRange}
          onDateChange={setDateRange}
        />
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          دانلود گزارش
        </Button>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="مقدار" fill="rgb(var(--c-primary-500))" />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
    </div>
  );
}
