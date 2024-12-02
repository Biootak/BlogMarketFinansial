'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';


interface UserStats {
  total: number;
  newThisMonth: number;
  roleDistribution: Array<{ name: string; value: number }>;
}

interface PostStats {
  total: number;
  published: number;
  monthlyPosts: Array<{ month: string; count: number }>;
}

interface CommentStats {
  total: number;
  pending: number;
  monthly: Array<{ month: string; count: number }>;
}

interface ViewStats {
  total: number;
  today: number;
  monthly: Array<{ month: string; count: number }>;
  topPosts: Array<{ title: string; views: number }>;
}

interface SystemReport {
  userStats: UserStats;
  postStats: PostStats;
  commentStats: CommentStats;
  viewStats: ViewStats;
}

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

interface Activity {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

interface ActionResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function checkReportAccess() {
  const session = await auth();
  
  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('شما دسترسی لازم برای مشاهده این بخش را ندارید');
  }
  
  return true;
}

export async function getSystemReports(): Promise<ActionResult<SystemReport>> {
  try {
    await checkReportAccess();
    const data: SystemReport = {
      userStats: {
        total: 1250,
        newThisMonth: 45,
        roleDistribution: [
          { name: 'کاربر عادی', value: 950 },
          { name: 'نویسنده', value: 200 },
          { name: 'مدیر', value: 100 }
        ]
      },
      postStats: {
        total: 324,
        published: 300,
        monthlyPosts: [
          { month: 'فروردین', count: 28 },
          { month: 'اردیبهشت', count: 32 },
          { month: 'خرداد', count: 25 }
        ]
      },
      commentStats: {
        total: 1543,
        pending: 23,
        monthly: [
          { month: 'فروردین', count: 156 },
          { month: 'اردیبهشت', count: 142 },
          { month: 'خرداد', count: 168 }
        ]
      },
      viewStats: {
        total: 25430,
        today: 342,
        monthly: [
          { month: 'فروردین', count: 8245 },
          { month: 'اردیبهشت', count: 7856 },
          { month: 'خرداد', count: 9329 }
        ],
        topPosts: [
          { title: 'راهنمای جامع سرمایه‌گذاری در بورس', views: 1245 },
          { title: 'تحلیل تکنیکال چیست؟', views: 986 },
          { title: 'معرفی بهترین صندوق‌های سرمایه‌گذاری', views: 854 }
        ]
      }
    };

    revalidatePath('/dashboard/reports');
    return { success: true, data };
  } catch (error) {
    console.error('Error in getSystemReports:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم' 
    };
  }
}

export async function getSystemStatus(): Promise<ActionResult<SystemStatus>> {
  try {
    const response = await fetch('/api/system-status', {
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch system status');
    }

    revalidatePath('/dashboard/status');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error in getSystemStatus:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطا در دریافت وضعیت سیستم' 
    };
  }
}

export async function getActivityLog(): Promise<ActionResult<Activity[]>> {
  try {
    await checkReportAccess();
    const data: Activity[] = [
      {
        id: '1',
        userEmail: 'admin@example.com',
        action: 'ورود',
        details: 'ورود موفق به سیستم',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        userEmail: 'writer@example.com',
        action: 'ایجاد مطلب',
        details: 'ایجاد مطلب جدید: راهنمای سرمایه‌گذاری',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        userEmail: 'editor@example.com',
        action: 'ویرایش',
        details: 'ویرایش مطلب: تحلیل تکنیکال',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    revalidatePath('/dashboard/activity');
    return { success: true, data };
  } catch (error) {
    console.error('Error in getActivityLog:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش فعالیت‌ها' 
    };
  }
}
