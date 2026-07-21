/**
 * /exchange-suspended — صفحه صرافی تعلیق‌شده
 *
 * وقتی وضعیت Exchange = SUSPENDED باشد، layout صرافی به اینجا redirect می‌کند.
 */
import { Button } from '@/components/ui/button';
import { AlertOctagon, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'دسترسی معلق | صرافی',
  robots: { index: false },
};

export default function ExchangeSuspendedPage() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--ds-canvas, #fafafa)',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          width: '100%',
          padding: '2.5rem',
          textAlign: 'center',
          background: 'var(--ds-surface, #fff)',
          border: '1px solid var(--ds-border-default)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in oklch, oklch(60% 0.18 25) 12%, transparent)',
          }}
        >
          <AlertOctagon
            style={{ width: '1.75rem', height: '1.75rem', color: 'oklch(50% 0.18 25)' }}
            aria-hidden
          />
        </div>

        <div>
          <h1
            style={{
              fontWeight: 700,
              fontSize: '1.25rem',
              marginBottom: '0.5rem',
              color: 'var(--ds-text-primary)',
            }}
          >
            صرافی شما تعلیق شده است
          </h1>
          <p
            style={{
              color: 'var(--ds-text-secondary)',
              fontSize: '0.9rem',
              lineHeight: 1.7,
            }}
          >
            دسترسی به پنل صرافی موقتاً غیرفعال شده است. برای اطلاعات بیشتر با پشتیبانی پلتفرم تماس
            بگیرید.
          </p>
        </div>

        <Link href="/dashboard" style={{ width: '100%' }}>
          <Button variant="outline" className="w-full gap-2">
            <ArrowRight style={{ width: '1rem', height: '1rem' }} aria-hidden />
            بازگشت به داشبورد
          </Button>
        </Link>
      </div>
    </div>
  );
}
