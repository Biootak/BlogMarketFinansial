'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

async function getSystemData() {
  try {
    const response = await fetch('/api/system-status', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch system data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching system data:', error);
    return null;
  }
}

export default function SystemLogsData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getSystemData();
      setData(result);
      setLoading(false);
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
    return <div className="text-red-500">خطا در دریافت اطلاعات سیستم</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(data).map(([key, value]: [string, any]) => (
        <div key={key} className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-[rgb(var(--c-primary-100))]">
          <h4 className="font-medium text-[rgb(var(--c-primary-600))]">{key}</h4>
          <p className="mt-1 text-sm">{JSON.stringify(value)}</p>
        </div>
      ))}
    </div>
  );
}
