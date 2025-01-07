'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSystemLogs } from '@/actions/reports/systemLogs';
import { Loader2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

function SystemLogsData() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [level, setLevel] = useState<string>('all');
  const limit = 10;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSystemLogs(page, limit, level === 'all' ? undefined : level);
      if (result.success && result.data) {
        setLogs(result.data.logs);
        setTotal(result.data.total);
      } else {
        toast({
          variant: "destructive",
          title: "خطا",
          description: result.message || "خطا در دریافت لاگ‌ها",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در دریافت لاگ‌ها",
      });
    } finally {
      setLoading(false);
    }
  }, [page, level]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'INFO':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">لاگ‌های سیستم</h3>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="فیلتر بر اساس سطح" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="ERROR">خطا</SelectItem>
            <SelectItem value="WARNING">هشدار</SelectItem>
            <SelectItem value="INFO">اطلاعات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">سطح</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">پیام</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">منبع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">زمان</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <span className="text-sm">{log.level}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{log.message}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{log.source}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.timestamp)}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            قبلی
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total}
          >
            بعدی
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SystemLogsData;
