'use client';

import { getActivityLog } from '@/actions/reportActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast, useToast } from '@/components/ui/use-toast';
;

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Loader2, Loader2 as Loader } from 'lucide-react';

interface SystemData {
  system?: {
    cpu?: {
      usage: number;
    };
    memory?: {
      usagePercentage: number;
    };
    os?: {
      platform: string;
    };
  };
  database?: {
    status: string;
    connections: number;
    responseTime: number;
  };
  application?: {
    users: number;
    posts: number;
    comments: number;
    environment: string;
  };
}

interface InitialData {
  logs: ActivityLog[];
  status: SystemData;
}

interface ActivityLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

export default function SystemLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [systemData, setSystemData] = useState<SystemData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    action: 'all',
    search: '',
  });

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getActivityLog();
        if (result.success && result.data) {
          setLogs(result.data);
          toast({
            title: 'موفقیت',
            description: 'لاگ‌های سیستم با موفقیت دریافت شدند',
            variant: 'success',
          });
        } else {
          setError(result.message || 'خطا در دریافت لاگ‌های سیستم');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'خطا در دریافت لاگ‌های سیستم');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getActivityLog();
        if (result.success) {
          setData(result.data);
        } else {
          toast({
            title: 'خطا',
            description: result.message || 'خطا در دریافت لاگ‌های سیستم',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'خطا',
          description: error instanceof Error ? error.message : 'خطا در دریافت لاگ‌های سیستم',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Get initial data from the server-rendered script tag
    const scriptTag = document.getElementById('system-logs-data');
    if (scriptTag) {
      try {
        const initialData: InitialData = JSON.parse(scriptTag.textContent || '{}');
        setLogs(initialData.logs);
        setSystemData(initialData.status);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing initial data:', err);
        setError('Failed to load initial data');
      }
    }
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter.action !== 'all' && log.action !== filter.action) return false;
    if (filter.search && !log.details.toLowerCase().includes(filter.search.toLowerCase()))
      return false;
    return true;
  });

  const _getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive">{level}</Badge>;
      case 'warning':
        return <Badge variant="default">{level}</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-500">خطا در دریافت لاگ‌های سیستم</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطا</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>CPU Usage:</span>
                <span>{systemData.system?.cpu?.usage}%</span>
              </div>
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span>{systemData.system?.memory?.usagePercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span>Platform:</span>
                <span>{systemData.system?.os?.platform}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge
                  variant={systemData.database?.status === 'outline' ? 'default' : 'destructive'}
                >
                  {systemData.database?.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Connections:</span>
                <span>{systemData.database?.connections}</span>
              </div>
              <div className="flex justify-between">
                <span>Response Time:</span>
                <span>{systemData.database?.responseTime}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Info */}
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Users:</span>
                <span>{systemData.application?.users}</span>
              </div>
              <div className="flex justify-between">
                <span>Posts:</span>
                <span>{systemData.application?.posts}</span>
              </div>
              <div className="flex justify-between">
                <span>Comments:</span>
                <span>{systemData.application?.comments}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <Badge>{systemData.application?.environment}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search logs..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
        <Select
          value={filter.action}
          onValueChange={(value) => setFilter({ ...filter, action: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setFilter({ action: 'all', search: '' })}>
          Reset Filters
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>زمان</TableHead>
              <TableHead>کاربر</TableHead>
              <TableHead>عملیات</TableHead>
              <TableHead>جزئیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.createdAt).toLocaleString('fa-IR')}</TableCell>
                <TableCell>{log.userEmail}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{log.action}</Badge>
                </TableCell>
                <TableCell>{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        {data.map((log: any, index: number) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4
                  className={`font-medium ${
                    log.level === 'error'
                      ? 'text-red-600'
                      : log.level === 'warning'
                        ? 'text-amber-600'
                        : 'text-[rgb(var(--c-primary-600))]'
                  }`}
                >
                  {log.message}
                </h4>
                {log.details && <p className="text-sm text-gray-600 mt-1">{log.details}</p>}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleDateString('fa-IR')}
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-sm">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  log.level === 'error'
                    ? 'bg-red-100 text-red-800'
                    : log.level === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[rgb(var(--c-primary-50))] text-[rgb(var(--c-primary-800))]'
                }`}
              >
                {log.level}
              </span>
              <span className="text-gray-500">{log.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
