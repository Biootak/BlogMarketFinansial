import { DashboardEmpty } from '@/components/Dashboard/primitives';
import { SearchX } from 'lucide-react';
import Link from 'next/link';

/**
 * Local not-found for /dashboard/*
 * Reuses the canonical DashboardEmpty primitive (rose tone) for visual consistency
 * with the rest of the dashboard's empty states.
 */
export default function DashboardNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <DashboardEmpty
          icon={<SearchX className="h-full w-full" strokeWidth={1.5} />}
          title="صفحه‌ای که دنبال آن می‌گردید پیدا نشد"
          description="ممکن است صفحه جابجا شده، حذف شده یا هنوز در دست ساخت باشد."
          tone="rose"
          size="lg"
          cta={{
            label: 'بازگشت به داشبورد',
            href: '/dashboard',
          }}
        />
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          نیاز به کمک دارید؟{' '}
          <Link
            href="/dashboard/service-requests/new"
            className="font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
          >
            ثبت درخواست پشتیبانی
          </Link>
        </p>
      </div>
    </div>
  );
}
