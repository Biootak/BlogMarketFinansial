'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Server, Database, HardDrive } from 'lucide-react';

interface SystemStatus {
  cpu: {
    usage: number;
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  database: {
    status: 'online' | 'offline' | 'error';
    connections: number;
    queryTime: number;
  };
  cache: {
    status: 'online' | 'offline';
    hitRate: number;
  };
  lastUpdate: string;
}

export default function SystemStatus() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/system-status');
        const result = await response.json();
        
        if (result.success) {
          setStatus(result.data);
        } else {
          throw new Error('Failed to load system status');
        }
      } catch (error) {
        console.error('Error loading system status:', error);
        toast({
          title: 'خطا',
          description: 'خطا در بارگذاری وضعیت سیستم',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    // هر 30 ثانیه به‌روزرسانی شود
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  const formatBytes = (bytes: number) => {
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
    if (bytes === 0) return '0 بایت';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return <div>در حال بارگذاری...</div>;
  }

  if (!status) {
    return <div>خطا در بارگذاری اطلاعات</div>;
  }

  const memoryUsagePercent = (status.memory.used / status.memory.total) * 100;
  const diskUsagePercent = (status.disk.used / status.disk.total) * 100;

  return (
    <div className="space-y-6">
      {/* هشدارهای سیستم */}
      {status.cpu.temperature > 80 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>هشدار دمای CPU</AlertTitle>
          <AlertDescription>
            دمای CPU به {status.cpu.temperature} درجه رسیده است. لطفاً بررسی کنید.
          </AlertDescription>
        </Alert>
      )}

      {memoryUsagePercent > 90 && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>هشدار مصرف حافظه</AlertTitle>
          <AlertDescription>
            مصرف حافظه به {memoryUsagePercent.toFixed(1)}% رسیده است.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CPU و دما */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">CPU</h3>
            <Server className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between mb-1">
                <span>مصرف CPU</span>
                <span>{status.cpu.usage}%</span>
              </div>
              <Progress value={status.cpu.usage} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>دما</span>
                <span>{status.cpu.temperature}°C</span>
              </div>
              <Progress 
                value={status.cpu.temperature} 
                max={100}
                className={status.cpu.temperature > 80 ? 'bg-red-200' : ''}
              />
            </div>
          </div>
        </Card>

        {/* حافظه */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">حافظه</h3>
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between mb-1">
              <span>مصرف حافظه</span>
              <span>{memoryUsagePercent.toFixed(1)}%</span>
            </div>
            <Progress value={memoryUsagePercent} />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">کل</div>
                <div>{formatBytes(status.memory.total)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">مصرف شده</div>
                <div>{formatBytes(status.memory.used)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">آزاد</div>
                <div>{formatBytes(status.memory.free)}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* دیسک */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">فضای دیسک</h3>
            <HardDrive className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between mb-1">
              <span>فضای مصرف شده</span>
              <span>{diskUsagePercent.toFixed(1)}%</span>
            </div>
            <Progress value={diskUsagePercent} />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">کل</div>
                <div>{formatBytes(status.disk.total)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">مصرف شده</div>
                <div>{formatBytes(status.disk.used)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">آزاد</div>
                <div>{formatBytes(status.disk.free)}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* وضعیت دیتابیس */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">دیتابیس</h3>
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status.database.status === 'online' ? 'bg-green-500' :
                status.database.status === 'error' ? 'bg-red-500' :
                'bg-yellow-500'
              }`} />
              <span>{
                status.database.status === 'online' ? 'آنلاین' :
                status.database.status === 'error' ? 'خطا' :
                'آفلاین'
              }</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">اتصال‌های فعال</div>
                <div>{status.database.connections}</div>
              </div>
              <div>
                <div className="text-muted-foreground">زمان پاسخ</div>
                <div>{status.database.queryTime}ms</div>
              </div>
            </div>
          </div>
        </Card>

        {/* وضعیت کش */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">کش</h3>
            <Server className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status.cache.status === 'online' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>{status.cache.status === 'online' ? 'آنلاین' : 'آفلاین'}</span>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">نرخ موفقیت کش</div>
              <div className="flex items-center">
                <Progress value={status.cache.hitRate} className="flex-1 mr-2" />
                <span>{status.cache.hitRate}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="text-sm text-muted-foreground text-right">
        آخرین به‌روزرسانی: {new Date(status.lastUpdate).toLocaleString('fa-IR')}
      </div>
    </div>
  );
}
