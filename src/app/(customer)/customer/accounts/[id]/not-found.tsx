/**
 * not-found.tsx — Account detail 404
 */
import Link from 'next/link';

export default function AccountNotFound() {
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
        حساب مورد نظر یافت نشد یا به آن دسترسی ندارید.
      </p>
      <Link
        href="/customer/accounts"
        style={{
          color: 'var(--at-accent)',
          fontSize: 'var(--ds-text-sm)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        بازگشت به حساب‌ها
      </Link>
    </div>
  );
}
