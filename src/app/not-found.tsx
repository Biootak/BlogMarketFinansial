import { Button } from '@/components/ui/button';
import { ArrowRight, Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-primary-50 via-neutral-50 to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 p-4"
    >
      <div className="max-w-lg w-full text-center">
        {/* 404 Number */}
        <div className="relative mb-8">
          <span className="text-[150px] font-black text-primary-100 dark:text-neutral-800 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-20 h-20 text-primary-500 dark:text-primary-400" />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-3">
            صفحه مورد نظر یافت نشد
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto gap-2">
                <Home className="w-4 h-4" />
                صفحه اصلی
              </Button>
            </Link>

            <Link href="/archive">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Search className="w-4 h-4" />
                آرشیو
              </Button>
            </Link>
          </div>
        </div>

        {/* Helpful links */}
        <div className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
          <p className="mb-2">شاید این لینک‌ها کمکتان کند:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/archive" className="hover:text-primary-500 transition-colors">
              آرشیو
            </Link>
            <Link href="/authors" className="hover:text-primary-500 transition-colors">
              نویسندگان
            </Link>
            <Link href="/contact" className="hover:text-primary-500 transition-colors">
              تماس با ما
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
