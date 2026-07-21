'use client';

import { getSystemStatus } from '@/actions/reportActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, Database, HardDrive, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SystemStatus {
  cpu?: {
    usage: number;
    temperature?: number;
  };
  memory?: {
    total: number;
    used: number;
    free: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
  };
  database?: {
    status: 'online' | 'offline' | 'error';
    connections: number;
    queryTime: number;
  };
  cache?: {
    status: 'online' | 'offline';
    hitRate: number;
  };
  lastUpdate?: string;
}

export default function SystemStatus() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const result = await getSystemStatus();
        if (result.success && result.data) {
          setStatus(result.data);
          setError(null);
          toast({
            title: 'موفقیت',
            description: 'وضعیت سیستم با موفقیت دریافت شد',
            variant: 'success',
          });
        } else {
          throw new Error(result.message || 'Failed to load system status');
        }
      } catch {
        setError('خطا در بارگذاری وضعیت سیستم');
        toast({
          title: 'خطا',
          description: 'خطا در دریافت وضعیت سیستم',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  const formatBytes = (bytes: number) => {
    if (!bytes || Number.isNaN(bytes)) return '0 بایت';
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" hideIcon>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطا</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!status) {
    return (
      <Alert hideIcon>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطا</AlertTitle>
        <AlertDescription>اطلاعات سیستم در دسترس نیست</AlertDescription>
      </Alert>
    );
  }

  const memoryUsagePercent = status.memory ? (status.memory.used / status.memory.total) * 100 : 0;

  const diskUsagePercent = status.disk ? (status.disk.used / status.disk.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* System Alerts */}
      {status.cpu?.temperature && status.cpu.temperature > 80 && (
        <Alert variant="destructive" hideIcon>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>هشدار دمای CPU</AlertTitle>
          <AlertDescription>
            دمای CPU به {status.cpu.temperature} درجه رسیده است. لطفاً بررسی کنید.
          </AlertDescription>
        </Alert>
      )}

      {status.memory && memoryUsagePercent > 90 && (
        <Alert variant="destructive" hideIcon>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>هشدار حافظه</AlertTitle>
          <AlertDescription>
            استفاده از حافظه به {Math.round(memoryUsagePercent)}% رسیده است.
          </AlertDescription>
        </Alert>
      )}

      {status.disk && diskUsagePercent > 90 && (
        <Alert variant="destructive" hideIcon>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>هشدار فضای دیسک</AlertTitle>
          <AlertDescription>
            استفاده از فضای دیسک به {Math.round(diskUsagePercent)}% رسیده است.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* CPU Status */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4" />
            <h3 className="font-medium">CPU</h3>
          </div>
          {status.cpu && (
            <div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>استفاده</span>
                  <span>{Math.round(status.cpu.usage)}%</span>
                </div>
                <Progress value={status.cpu.usage} />
              </div>
              {status.cpu.temperature && (
                <div className="mt-2 text-sm">
                  <span>دما: {status.cpu.temperature}°C</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Memory Status */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4" />
            <h3 className="font-medium">حافظه</h3>
          </div>
          {status.memory && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>استفاده</span>
                <span>{Math.round(memoryUsagePercent)}%</span>
              </div>
              <Progress value={memoryUsagePercent} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>کل: {formatBytes(status.memory.total)}</div>
                <div>آزاد: {formatBytes(status.memory.free)}</div>
              </div>
            </div>
          )}
        </Card>

        {/* Disk Status */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-4 w-4" />
            <h3 className="font-medium">دیسک</h3>
          </div>
          {status.disk && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>استفاده</span>
                <span>{Math.round(diskUsagePercent)}%</span>
              </div>
              <Progress value={diskUsagePercent} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>کل: {formatBytes(status.disk.total)}</div>
                <div>آزاد: {formatBytes(status.disk.free)}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Database Status */}
      {status.database && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <h3 className="font-medium">وضعیت دیتابیس</h3>
            </div>
            <div className="flex items-center gap-2">
              {status.database.status === 'online' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {status.database.status === 'online' ? 'آنلاین' : 'آفلاین'}
              </span>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <div>اتصالات فعال: {status.database.connections}</div>
            <div>زمان پاسخ: {status.database.queryTime}ms</div>
          </div>
        </Card>
      )}

      {status.lastUpdate && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          آخرین به‌روزرسانی: {new Date(status.lastUpdate).toLocaleString('fa-IR')}
        </div>
      )}
    </div>
  );
}
