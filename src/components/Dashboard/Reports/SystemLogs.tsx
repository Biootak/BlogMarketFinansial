'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: string;
}

export default function SystemLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: 'all',
    source: 'all',
    search: '',
  });

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/system-logs');
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data);
      } else {
        throw new Error('Failed to load system logs');
      }
    } catch (error) {
      console.error('Error loading system logs:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری لاگ‌های سیستم',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // هر 30 ثانیه به‌روزرسانی شود
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const levelMatch = filter.level === 'all' || log.level.toLowerCase() === filter.level.toLowerCase();
    const sourceMatch = filter.source === 'all' || log.source === filter.source;
    const searchMatch = !filter.search || 
      log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
      log.source.toLowerCase().includes(filter.search.toLowerCase());
    
    return levelMatch && sourceMatch && searchMatch;
  });

  const uniqueSources = Array.from(new Set(logs.map(log => log.source)));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="جستجو در لاگ‌ها..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full"
            />
          </div>
          <Select
            value={filter.level}
            onValueChange={(value) => setFilter(prev => ({ ...prev, level: value }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="سطح لاگ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="error">خطا</SelectItem>
              <SelectItem value="warning">هشدار</SelectItem>
              <SelectItem value="info">اطلاعات</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.source}
            onValueChange={(value) => setFilter(prev => ({ ...prev, source: value }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="منبع لاگ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {uniqueSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={loadLogs}
            disabled={loading}
          >
            به‌روزرسانی
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">سطح</TableHead>
                <TableHead>پیام</TableHead>
                <TableHead className="w-[150px]">منبع</TableHead>
                <TableHead className="w-[180px]">زمان</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    در حال بارگذاری...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    لاگی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        <Badge className={getLevelColor(log.level)}>
                          {log.level}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString('fa-IR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
