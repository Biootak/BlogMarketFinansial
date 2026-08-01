import { getAllCreditRates } from '@/actions/credit-rates';
import type { Metadata } from 'next';
import s from './credit-rates.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'نرخ‌های اعتباری و تسهیلات بانکی',
  description: 'جدول نرخ سود تسهیلات و سپرده‌های بانکی — وام مسکن، شخصی، کسب‌وکار و سپرده‌گذاری.',
  alternates: { canonical: '/credit-rates' },
};

// H7-fix (2026-08-01): قبلاً /credit-rates به /archive (آرشیو بلاگ) redirect
// می‌شد — گمراه‌کننده و بی‌ربط. حالا صفحهٔ واقعی با دادهٔ DB (CreditRate/Bank)
// نمایش داده می‌شود. /credit-rates/[bank] هم به همین صفحه با فیلتر بانک می‌رود.

const TYPE_LABELS: Record<string, string> = {
  MORTGAGE: 'وام مسکن',
  PERSONAL: 'وام شخصی',
  AUTO: 'وام خودرو',
  BUSINESS: 'وام کسب‌وکار',
  QARD_AL_HASAN: 'قرض‌الحسنه',
  EDUCATION: 'وام تحصیلی',
  AGRICULTURE: 'وام کشاورزی',
  COMMERCIAL: 'وام تجاری',
  DEPOSIT: 'سپرده سرمایه‌گذاری',
  OTHER: 'سایر',
};

const fmtPct = (n: number): string =>
  `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(n)}٪`;

const fmtAmount = (cents: number): string =>
  new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(cents / 100);

export default async function CreditRatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const bankParam = typeof sp.bank === 'string' ? sp.bank : '';

  const result = await getAllCreditRates({ onlyActive: true });

  if (!result.success) {
    return (
      <main className={s.page} dir="rtl">
        <div className={s.empty}>
          <p>در حال حاضر نرخی برای نمایش موجود نیست.</p>
        </div>
      </main>
    );
  }

  let banks = result.data.banks;
  let rates = result.data.rates;

  // فیلتر بانک از ?bank= (از مسیر قدیمی /credit-rates/[bank])
  if (bankParam) {
    const match = banks.filter(
      (b) => b.slug === bankParam || b.id === bankParam || b.displayName === bankParam,
    );
    if (match.length > 0) {
      banks = match;
      rates = rates.filter((r) => match.some((b) => b.id === r.bankId));
    }
  }

  // گروه‌بندی نرخ‌ها به تفکیک بانک
  const byBank = banks.map((bank) => ({
    bank,
    rates: rates.filter((r) => r.bankId === bank.id),
  }));

  const totalBanks = banks.length;
  const totalRates = rates.length;
  const totalCents = rates.reduce((s, r) => s + (r.minAmountCents ?? 0), 0);

  return (
    <main className={s.page} dir="rtl">
      {/* ── Header ── */}
      <header className={s.head}>
        <div className={s.eyebrow}>بانک‌ها و مؤسسات اعتباری</div>
        <h1 className={s.title}>نرخ‌های اعتباری و تسهیلات</h1>
        <p className={s.sub}>
          {totalBanks} بانک · {totalRates} محصول اعتباری · آخرین بروزرسانی لحظه‌ای
        </p>
      </header>

      {/* ── Stats strip ── */}
      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statLabel}>بانک فعال</span>
          <span className={s.statValue}>{new Intl.NumberFormat('fa-IR').format(totalBanks)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>محصول اعتباری</span>
          <span className={s.statValue}>{new Intl.NumberFormat('fa-IR').format(totalRates)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>میانگین حداقل وام</span>
          <span className={s.statValue}>
            {new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
              totalCents / 100 / Math.max(1, totalRates),
            )}{' '}
            <span className={s.statUnit}>واحد</span>
          </span>
        </div>
      </div>

      {/* ── Bank cards ── */}
      <div className={s.bankGrid}>
        {byBank.map(({ bank, rates: bankRates }) => (
          <section
            key={bank.id}
            className={s.bankCard}
            aria-label={`${bank.displayName ?? bank.name} — نرخ‌ها`}
          >
            <header className={s.bankHead}>
              {bank.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bank.logoUrl} alt="" className={s.bankLogo} loading="lazy" />
              ) : (
                <span className={s.bankLogoFallback}>
                  {(bank.displayName ?? bank.name).charAt(0)}
                </span>
              )}
              <div className={s.bankMeta}>
                <h2 className={s.bankName}>{bank.displayName ?? bank.name}</h2>
                <p className={s.bankSub}>
                  {bank.city ?? bank.country}
                  {bank.website ? ` · ${bank.website.replace(/^https?:\/\//, '')}` : ''}
                </p>
              </div>
            </header>

            {bankRates.length === 0 ? (
              <p className={s.noRates}>فعلاً محصول اعتباری فعالی ندارد.</p>
            ) : (
              <ul className={s.rateList}>
                {bankRates.map((r) => (
                  <li key={r.id} className={s.rateItem}>
                    <div className={s.rateMain}>
                      <span className={s.rateType}>{TYPE_LABELS[r.type] ?? r.title}</span>
                      <span className={s.rateTitle}>{r.title}</span>
                    </div>
                    <div className={s.rateSide}>
                      <span className={s.ratePct}>{fmtPct(r.annualRate)}</span>
                      <span className={s.rateRange}>
                        از {fmtAmount(r.minAmountCents ?? 0)}
                        {r.maxAmountCents ? ` تا ${fmtAmount(r.maxAmountCents)}` : ''} {r.currency}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className={s.foot}>
        <span>
          نرخ‌ها به‌صورت دوره‌ای توسط پلتفرم به‌روزرسانی می‌شوند. برای اعتبارسنجی نهایی با بانک تماس
          بگیرید.
        </span>
      </footer>
    </main>
  );
}
