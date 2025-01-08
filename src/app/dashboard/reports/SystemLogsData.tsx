'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSystemLogs } from '@/actions/reportActions';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import Loading from '@/components/Loading';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

export default function SystemLogsData() {
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
          variant: 'destructive',
          title: 'خطا',
          description: result.message || 'خطا در دریافت لاگ‌ها',
        });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در دریافت لاگ‌ها',
      });
    } finally {
      setLoading(false);
    }
  }, [page, level]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="انتخاب سطح لاگ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="INFO">اطلاعات</SelectItem>
            <SelectItem value="WARNING">هشدار</SelectItem>
            <SelectItem value="ERROR">خطا</SelectItem>
          </SelectContent>
        </Select>

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

      <div className="bg-white/50 backdrop-blur-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgb(var(--c-primary-200))]">
                <th className="px-4 py-2 text-right">سطح</th>
                <th className="px-4 py-2 text-right">پیام</th>
                <th className="px-4 py-2 text-right">منبع</th>
                <th className="px-4 py-2 text-right">زمان</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[rgb(var(--c-primary-100))] hover:bg-[rgb(var(--c-primary-50))]"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <span>{log.level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">{log.message}</td>
                  <td className="px-4 py-2">{log.source}</td>
                  <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-sm text-[rgb(var(--c-primary-600))]">
        نمایش {Math.min(page * limit, total)} از {total} مورد
      </div>
    </div>
  );
}

function getLevelIcon(level: string) {
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
}
