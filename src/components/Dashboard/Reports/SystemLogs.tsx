'use client';

import { useEffect, useState } from 'react';
import { getSystemLogs } from '@/actions/reportActions';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, AlertTriangle, Info, Loader2 as Loader } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: string;
}

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
  logs: SystemLog[];
  status: SystemData;
}

export default function SystemLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [systemData, setSystemData] = useState<SystemData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    level: 'all',
    source: 'all',
    search: '',
  });

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSystemLogs();
        if (result.success) {
          setData(result.data);
        } else {
          toast({
            variant: "destructive",
            title: "خطا",
            description: result.message || "خطا در دریافت لاگ‌های سیستم"
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطا",
          description: error instanceof Error ? error.message : "خطا در دریافت لاگ‌های سیستم"
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

  const filteredLogs = logs.filter(log => {
    if (filter.level !== 'all' && log.level !== filter.level) return false;
    if (filter.source !== 'all' && log.source !== filter.source) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive">{level}</Badge>;
      case 'warning':
        return <Badge variant="warning">{level}</Badge>;
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
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                <Badge variant={systemData.database?.status === 'online' ? 'success' : 'destructive'}>
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
          value={filter.level}
          onValueChange={(value) => setFilter({ ...filter, level: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.source}
          onValueChange={(value) => setFilter({ ...filter, source: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="auth">Authentication</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setFilter({ level: 'all', source: 'all', search: '' })}
        >
          Reset Filters
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Level</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[150px]">Source</TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{getLevelBadge(log.level)}</TableCell>
                <TableCell>{log.message}</TableCell>
                <TableCell>{log.source}</TableCell>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        {data.map((log: any, index: number) => (
          <div key={index} className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
            <div className="flex justify-between items-start">
              <div>
                <h4 className={`font-medium ${
                  log.level === 'error' ? 'text-red-600' :
                  log.level === 'warning' ? 'text-amber-600' :
                  'text-[rgb(var(--c-primary-600))]'
                }`}>
                  {log.message}
                </h4>
                {log.details && (
                  <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleDateString('fa-IR')}
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded-full ${
                log.level === 'error' ? 'bg-red-100 text-red-800' :
                log.level === 'warning' ? 'bg-amber-100 text-amber-800' :
                'bg-[rgb(var(--c-primary-50))] text-[rgb(var(--c-primary-800))]'
              }`}>
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
