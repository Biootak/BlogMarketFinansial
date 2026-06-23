// 2026-06-23: utility footer (server, 2026 redesign).
// Three columns: brand identity, live system status, support.
// Status badge reflects the most recent DB write so the footer is honest.
import prisma from '@/lib/db';
import { formatFaNumber } from '@/lib/fa-number';
import { safeCache } from '@/lib/safe-cache';

const getStatus = safeCache<
  [],
  { ok: boolean; sinceMinutes: number | null }
>(
  async () => {
    try {
      const latest = await prisma.systemLog.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });
      const sinceMinutes = latest
        ? Math.max(
            0,
            Math.round((Date.now() - latest.timestamp.getTime()) / 60000),
          )
        : null;
      return { ok: sinceMinutes !== null && sinceMinutes < 60, sinceMinutes };
    } catch {
      return { ok: false, sinceMinutes: null };
    }
  },
  { ok: false, sinceMinutes: null },
  { key: 'auth-footer-status', ttl: 30, tags: ['dashboard-stats'] },
);

export default async function AuthFooter() {
  const year = new Date().getFullYear();
  const status = await getStatus();
  return (
    <footer className="auth-footer" aria-label="پانویس صفحه احراز هویت">
      <div className="auth-footer-inner">
        <p className="auth-footer-meta">
          © {formatFaNumber(year)} بازار مالی
        </p>
        <p className="auth-footer-meta auth-footer-status">
          <span
            className={
              status.ok
                ? 'auth-footer-status-dot'
                : 'auth-footer-status-dot auth-footer-status-dot--idle'
            }
            aria-hidden="true"
          />
          {status.ok
            ? `سیستم فعال — ${formatFaNumber(status.sinceMinutes ?? 0)} دقیقه پیش`
            : 'در حال همگام‌سازی سیستم'}
        </p>
        <p className="auth-footer-meta auth-footer-meta--strong">
          پشتیبانی:{' '}
          <a
            href="mailto:support@financialmarket.com"
            className="auth-footer-link"
          >
            support@financialmarket.com
          </a>
        </p>
      </div>
    </footer>
  );
}