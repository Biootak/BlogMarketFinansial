'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Database, HardDrive, Server } from 'lucide-react';

interface SystemStatus {
  cpu: {
    usage: number;
    temperature: number;
    frequency: number;
  };
  memory: {
    total: number;
    free: number;
    usagePercentage: number;
  };
  storage: {
    total: number;
    free: number;
    usagePercentage: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
  };
}

interface SystemStatusClientProps {
  data: SystemStatus | null;
  error: string | null;
}

export function SystemStatusClient({ data, error }: SystemStatusClientProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container py-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">وضعیت سیستم</h1>

      {/* CPU Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Server className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">وضعیت پردازنده</h2>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>استفاده از CPU</span>
              <span>{data.cpu.usage}%</span>
            </div>
            <Progress value={data.cpu.usage} className="h-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">دمای CPU</p>
              <p className="text-lg font-medium">{data.cpu.temperature}°C</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">فرکانس</p>
              <p className="text-lg font-medium">{data.cpu.frequency} GHz</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Memory Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">وضعیت حافظه</h2>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>استفاده از حافظه</span>
              <span>{data.memory.usagePercentage}%</span>
            </div>
            <Progress value={data.memory.usagePercentage} className="h-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">حافظه کل</p>
              <p className="text-lg font-medium">{data.memory.total} GB</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">حافظه آزاد</p>
              <p className="text-lg font-medium">{data.memory.free} GB</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Storage Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <HardDrive className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">وضعیت فضای ذخیره‌سازی</h2>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>فضای استفاده شده</span>
              <span>{data.storage.usagePercentage}%</span>
            </div>
            <Progress value={data.storage.usagePercentage} className="h-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">فضای کل</p>
              <p className="text-lg font-medium">{data.storage.total} GB</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">فضای آزاد</p>
              <p className="text-lg font-medium">{data.storage.free} GB</p>
            </div>
          </div>
        </div>
      </Card>

      {/* System Health Status */}
      <Alert variant={data.health.status === 'healthy' ? 'default' : 'destructive'} hideIcon>
        <div className="flex items-center gap-2">
          {data.health.status === 'healthy' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <AlertTitle>
            {data.health.status === 'healthy' ? 'سیستم سالم است' : 'مشکل در سیستم'}
          </AlertTitle>
        </div>
        <AlertDescription>{data.health.message}</AlertDescription>
      </Alert>
    </div>
  );
}
