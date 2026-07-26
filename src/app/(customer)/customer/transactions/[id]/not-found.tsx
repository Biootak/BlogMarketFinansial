/**
 * not-found.tsx — Transaction detail 404
 */
import Link from 'next/link';

export default function TransactionNotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--ds-space-4)',
        padding: 'var(--ds-space-10)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--at-fg-muted)',
        }}
      >
        تراکنش مورد نظر یافت نشد یا به آن دسترسی ندارید.
      </p>
      <Link
        href="/customer/transactions"
        style={{
          color: 'var(--at-accent)',
          fontSize: 'var(--ds-text-sm)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        بازگشت به تراکنش‌ها
      </Link>
    </div>
  );
}
