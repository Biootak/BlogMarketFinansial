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
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    action: 'all',
    search: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getActivityLog();
        if (result.success && result.data) {
          setLogs(result.data);
        } else {
          const msg = result.message || 'خطا در دریافت لاگ‌های سیستم';
          setError(msg);
          toast({
            title: 'خطا',
            description: msg,
            variant: 'destructive',
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در دریافت لاگ‌های سیستم';
        setError(msg);
        toast({
          title: 'خطا',
          description: msg,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredLogs = logs.filter((log) => {
    if (filter.action !== 'all' && log.action !== filter.action) return false;
    if (filter.search && !log.details.toLowerCase().includes(filter.search.toLowerCase()))
      return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="جست‌وجو در لاگ‌ها..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
        <Select
          value={filter.action}
          onValueChange={(value) => setFilter({ ...filter, action: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="فیلتر عملیات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه عملیات</SelectItem>
            <SelectItem value="ورود به سیستم">ورود به سیستم</SelectItem>
            <SelectItem value="خروج از سیستم">خروج از سیستم</SelectItem>
            <SelectItem value="ایجاد پست">ایجاد پست</SelectItem>
            <SelectItem value="ویرایش پست">ویرایش پست</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setFilter({ action: 'all', search: '' })}>
          پاک کردن فیلتر
        </Button>
      </div>

      {filteredLogs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>لاگ‌های فعالیت</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              {logs.length === 0 ? 'هیچ لاگی ثبت نشده است.' : 'هیچ لاگی با این فیلتر یافت نشد.'}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('fa-IR')}
                  </TableCell>
                  <TableCell className="text-sm">{log.userEmail}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
