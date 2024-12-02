'use client';

import { useEffect, useState } from 'react';
import { getActivityLog } from '@/actions/reportActions';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ActivityLog() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getActivityLog();
        if (result.success) {
          setData(result.data);
        } else {
          toast({
            variant: "destructive",
            title: "خطا",
            description: result.message || "خطا در دریافت گزارش فعالیت‌ها"
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطا",
          description: error instanceof Error ? error.message : "خطا در دریافت گزارش فعالیت‌ها"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-500">خطا در دریافت گزارش فعالیت‌ها</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((activity: any) => (
        <div key={activity.id} className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-[rgb(var(--c-primary-600))]">{activity.action}</h4>
              <p className="text-sm text-gray-600">{activity.details}</p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(activity.createdAt).toLocaleDateString('fa-IR')}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {activity.userEmail}
          </div>
        </div>
      ))}
    </div>
  );
}
