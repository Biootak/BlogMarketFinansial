/**
 * /customer/crypto — Crypto & Digital Assets Dashboard
 *
 * نسخهٔ Customer Portal: مشاهدهٔ دارایی‌های دیجیتال، نرخ‌های زنده، تاریخچه.
 * KYC-gated: اگر KYC تأیید نشده باشد، CTA شروع KYC نمایش داده می‌شود.
 */

import { getCustomerProfile } from '@/actions/customer-portal';
import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CryptoAssetsPanel } from './_components/CryptoAssetsPanel';

export const metadata: Metadata = {
  title: 'ارزهای دیجیتال | پنل مشتری',
  description: 'دارایی‌های دیجیتال، نرخ‌های لحظه‌ای و تاریخچه',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type WalletEntry = {
  id: string;
  currency: string;
  balance: number;
  type: string;
  status: string;
  updatedAt: string;
};

// C2-fix (2026-08-01): balance در DB به‌صورت سنت (BigInt) ذخیره می‌شود و در
// همه‌جای پلتفرم با mapBalance() (تقسیم بر ۱۰۰) نمایش داده می‌شود. این صفحه
// قبلاً Number(a.balance) خام می‌خواند → موجودی‌های رمزارز ۱۰۰ برابر نادرست
// نمایش داده می‌شدند (مثلاً 500000 سنت به‌جای 5000). حالا هم‌خوان با بقیهٔ
// سطوح، /100 می‌شود.
async function loadCryptoWallets(customerId: string): Promise<WalletEntry[]> {
  // فقط حساب‌های ارز دیجیتال (BTC, ETH, USDT, …) — شناسایی از طریق واحد ارز
  const CRYPTO_SYMBOLS = new Set([
    'BTC',
    'ETH',
    'USDT',
    'USDC',
    'BNB',
    'SOL',
    'XRP',
    'ADA',
    'DOGE',
    'TRX',
    'TON',
  ]);
  const accounts = await prisma.fintechAccount.findMany({
    where: { customerId, status: 'ACTIVE' },
    select: { id: true, currency: true, balance: true, type: true, status: true, updatedAt: true },
    orderBy: { balance: 'desc' },
  });
  return accounts
    .filter((a) => CRYPTO_SYMBOLS.has(a.currency.toUpperCase()))
    .map((a) => ({
      id: a.id,
      currency: a.currency.toUpperCase(),
      balance: Number(a.balance) / 100,
      type: a.type,
      status: a.status,
      updatedAt: a.updatedAt.toISOString(),
    }));
}

export default async function CustomerCryptoPage() {
  // auth() اینجا حذف شد — layout.tsx قبلاً authenticate کرده.
  // getCustomerProfile() اگر دسترسی نباشد null برمی‌گرداند.
  const profile = await getCustomerProfile();
  if (!profile) {
    redirect('/customer/dashboard');
  }

  const [wallets, ratesRes] = await Promise.all([
    loadCryptoWallets(profile.id),
    fetchCryptoTickerRates(),
  ]);

  const rates = ratesRes.success && ratesRes.data ? ratesRes.data : [];

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        eyebrow="دارایی‌های دیجیتال"
        title="کیف پول ارزهای دیجیتال"
        description="موجودی، نرخ لحظه‌ای و سابقه تراکنش‌های ارزهای دیجیتال شما"
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'ارزهای دیجیتال' },
        ]}
        icon="circle-dollar-sign"
        accent="violet"
      />
      <CryptoAssetsPanel
        wallets={wallets}
        rates={rates}
        kycStatus={profile.kycStatus}
        exchangeName={profile.exchange.name}
      />
    </div>
  );
}
