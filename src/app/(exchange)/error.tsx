'use client';

import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ExchangeError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      className="nova-content-area"
      dir="rtl"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}
    >
      <div
        className="dash-panel"
        style={{
          maxWidth: '28rem',
          width: '100%',
          padding: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
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
            background: 'var(--at-warning-soft, #fef3c7)',
          }}
        >
          <AlertTriangle
            style={{ width: '1.75rem', height: '1.75rem', color: 'var(--at-warning, #d97706)' }}
          />
        </div>

        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.375rem' }}>
            خطا در بارگذاری
          </h2>
          <p style={{ color: 'var(--at-text-muted)', fontSize: '0.875rem' }}>
            مشکلی در بارگذاری این بخش پیش آمده. لطفاً دوباره تلاش کنید.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          <Button onClick={reset} className="w-full gap-2">
            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
            تلاش مجدد
          </Button>
          <Link href="/exchange/dashboard">
            <Button variant="outline" className="w-full gap-2">
              <Home style={{ width: '1rem', height: '1rem' }} />
              داشبورد صرافی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
