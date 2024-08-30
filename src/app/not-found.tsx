import ButtonPrimary from '@/components/Button/ButtonPrimary';
import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const Page404: React.FC = () => (
  <div className="nc-Page404 font-vazir min-h-screen flex flex-col justify-center items-center">
    <div className="container relative py-16 lg:py-20">
      <div className="text-center max-w-2xl mx-auto space-y-10">
        <div className="text-neutral-600 dark:text-neutral-300 flex justify-center">
          <div className="relative w-full h-[400px] max-w-[400px]">
            <Image
              src="/images/Error-404.svg"
              alt="404 صفحه پیدا نشد"
              fill
              style={{ objectFit: 'contain' }}
              sizes="(max-width: 400px) 100vw, 400px"
            />
          </div>
        </div>

        <p className="text-xl text-neutral-800 dark:text-neutral-200 leading-relaxed">
          متأسفانه صفحه‌ای که به دنبال آن بودید پیدا نشد.
          <br />
          ممکن است آدرس تغییر کرده یا صفحه حذف شده باشد.
        </p>
        <Link href="/">
          <Button variant={'secondary'} className="mt-8 inline-block">
            بازگشت به صفحه اصلی
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

export default Page404;
