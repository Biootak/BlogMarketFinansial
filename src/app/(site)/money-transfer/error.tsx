'use client';

/**
 * error.tsx — money-transfer route group
 * #27 fix: Error boundary برای صفحه حواله پول اضافه شد
 */

import { useEffect } from 'react';

export default function MoneyTransferError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error boundary — فقط در client می‌بینیم، سرور از Sentry log می‌کند
    void error;
  }, [error]);

  return (
    <div style={{ padding: 'var(--ds-space-8)', textAlign: 'center', direction: 'rtl' }}>
      <h2 style={{ fontSize: 'var(--ds-text-lg)', marginBottom: 'var(--ds-space-3)' }}>
        خطایی رخ داد
      </h2>
      <p style={{ color: 'var(--ds-text-3)', marginBottom: 'var(--ds-space-4)' }}>
        بارگذاری صفحه با مشکل مواجه شد. لطفاً دوباره تلاش کنید.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: 'var(--ds-space-2) var(--ds-space-4)',
          background: 'var(--ds-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--ds-radius-sm)',
          cursor: 'pointer',
          fontSize: 'var(--ds-text-sm)',
        }}
      >
        تلاش مجدد
      </button>
    </div>
  );
}
