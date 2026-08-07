'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

interface PriceSource {
  id: string;
  name: string;
  url: string;
  type: 'html' | 'json' | 'api';
  enabled: boolean;
  priority: number;
  fetchCount: number;
  errorCount: number;
  lastFetchAt?: Date;
  lastFetchStatus?: 'active' | 'inactive' | 'error';
}

interface PriceSourcesClientProps {
  sources: PriceSource[];
}

export function PriceSourcesClient({ sources }: PriceSourcesClientProps) {
  const [localSources, setLocalSources] = useState(sources);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggle = (id: string, enabled: boolean) => {
    setLocalSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
    // TODO: Call API to update DB
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Call API to test all sources
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'inactive':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">فعال</Badge>;
      case 'error':
        return <Badge variant="destructive">خطا</Badge>;
      case 'inactive':
        return <Badge variant="secondary">غیرفعال</Badge>;
      default:
        return <Badge variant="outline">نامشخص</Badge>;
    }
  };

  const sortedSources = [...localSources].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">مدیریت منابع قیمت</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            منابع وب‌اسکریپت قیمت را مدیریت کنید
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            تست منابع
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            افزودن منبع
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedSources.map((source) => (
          <Card key={source.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {source.name}
                  </h3>
                  {getStatusBadge(source.lastFetchStatus)}
                  <Badge variant="outline">priority: {source.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <ExternalLink className="h-3 w-3" />
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {source.url}
                  </a>
                  <Badge variant="outline" className="text-xs">
                    {source.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">دریافت:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {source.fetchCount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">خطا:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {source.errorCount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  {source.lastFetchAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">آخرین دریافت:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(source.lastFetchAt).toLocaleTimeString('fa-IR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={(checked) => handleToggle(source.id, checked)}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">فعال</span>
                </div>
                {getStatusIcon(source.lastFetchStatus)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
