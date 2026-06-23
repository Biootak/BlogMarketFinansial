// 2026-06-23: editorial sidecar with live DB stats (2026 redesign).
// True production quality: no fabricated numbers, no fake content.
// Layout: live pulse eyebrow, gradient-emphasis headline, lede,
// three commitments with hairline dividers, then a live market strip
// showing real DB facts from `safeCache`. Falls back gracefully.

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import { formatFaNumber } from '@/lib/fa-number';

type Promise = { title: string; body: string };

type Pulse = {
  crypto: number | null;
  forex: number | null;
  gold: number | null;
  ratesUpdatedAt: Date | null;
} & { fallback: boolean };

const EMPTY_PULSE: Pulse = {
  crypto: null,
  forex: null,
  gold: null,
  ratesUpdatedAt: null,
  fallback: true,
};

const getPulse = safeCache<[], Pulse>(
  async () => {
    try {
      const [crypto, forex, gold, latestFx] = await Promise.all([
        prisma.exchangeRate
          .count({ where: { active: true, group: 'crypto' } })
          .catch(() => null),
        prisma.exchangeRate
          .count({ where: { active: true, group: 'iran-forex' } })
          .catch(() => null),
        prisma.exchangeRate
          .count({ where: { active: true, group: { in: ['iran-gold', 'iran-coin'] } } })
          .catch(() => null),
        prisma.exchangeRate.findFirst({
          where: { active: true },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);
      return {
        crypto,
        forex,
        gold,
        ratesUpdatedAt: latestFx?.updatedAt ?? null,
        fallback: false,
      };
    } catch {
      return EMPTY_PULSE;
    }
  },
  EMPTY_PULSE,
  { key: 'auth-sidecar-pulse', ttl: 60, tags: ['exchange-rates'] },
);

function PersianIndex(n: number): string {
  return '۰' + formatFaNumber(n);
}

export default async function AuthSidecar({
  eyebrow,
  headline,
  lede,
  promises,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  lede: string;
  promises: ReadonlyArray<Promise>;
}) {
  const pulse = await getPulse();
  const sinceMinutes = pulse.ratesUpdatedAt
    ? Math.max(0, Math.round((Date.now() - pulse.ratesUpdatedAt.getTime()) / 60000))
    : null;

  return (
    <aside className="auth-sidecar" aria-label="معرفی و آمار زنده بازار مالی">
      <p className="auth-sidecar-eyebrow">
        <span className="auth-sidecar-eyebrow-dot" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="auth-sidecar-headline">{headline}</h2>
      <p className="auth-sidecar-lede">{lede}</p>

      <ul className="auth-sidecar-promises">
        {promises.map((p, idx) => (
          <li key={p.title} className="auth-sidecar-promise">
            <span className="auth-sidecar-promise-num" aria-hidden="true">
              {PersianIndex(idx + 1)}
            </span>
            <div>
              <p className="auth-sidecar-promise-title">{p.title}</p>
              <p className="auth-sidecar-promise-body">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {!pulse.fallback && (
        <section
          className="auth-sidecar-strip"
          aria-label="آمار زنده بازار"
        >
          <p className="auth-sidecar-strip-label">پالس زنده بازار</p>
          <p className="auth-sidecar-strip-row">
            <span className="auth-sidecar-strip-key">رمزارزهای فعال</span>
            <span className="auth-sidecar-strip-value">
              {pulse.crypto !== null ? formatFaNumber(pulse.crypto) : '—'}
            </span>
          </p>
          <p className="auth-sidecar-strip-row">
            <span className="auth-sidecar-strip-key">ارزهای فیات</span>
            <span className="auth-sidecar-strip-value">
              {pulse.forex !== null ? formatFaNumber(pulse.forex) : '—'}
            </span>
          </p>
          <p className="auth-sidecar-strip-row">
            <span className="auth-sidecar-strip-key">طلا و سکه</span>
            <span className="auth-sidecar-strip-value">
              {pulse.gold !== null ? formatFaNumber(pulse.gold) : '—'}
            </span>
          </p>
          <p className="auth-sidecar-strip-row">
            <span className="auth-sidecar-strip-key">آخرین به‌روزرسانی نرخ</span>
            <span className="auth-sidecar-strip-value">
              {sinceMinutes !== null
                ? `${formatFaNumber(sinceMinutes)} دقیقه پیش`
                : 'هنوز ثبت نشده'}
            </span>
          </p>
        </section>
      )}
    </aside>
  );
}