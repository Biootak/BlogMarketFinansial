import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import TrackingPageClient from './_components/TrackingPageClient';

// ─── generateMetadata — per-request SEO ──────────────────────────────────── //

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT:         'پرداخت آنلاین',
  TUITION_PAYMENT:        'پرداخت شهریه',
  FREELANCE_INCOME:       'نقد کردن درآمد فریلنسری',
  SOFTWARE_PURCHASE:      'خرید نرم‌افزار',
  OTHER:                  'سایر خدمات',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED:   'تکمیل شده',
  CANCELLED:   'لغو شده',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const upper = code.trim().toUpperCase();
  const res = await getServiceRequestByTrackingCode(upper);

  if (!res.success || !res.data) {
    return {
      title: 'کد پیگیری یافت نشد | بازار مالی',
      description: 'کد پیگیری وارد شده معتبر نیست.',
    };
  }

  const d = res.data;
  const serviceLabel = SERVICE_LABELS[d.serviceType] ?? d.serviceType;
  const statusLabel  = STATUS_LABELS[d.status]       ?? d.status;
  const title        = `پیگیری ${upper} | ${serviceLabel}`;
  const description  = `وضعیت: ${statusLabel} · ${d.amount} ${d.currency} · ${serviceLabel}`;

  return {
    title,
    description,
    // Noindex — tracking pages are private, not meant for search engines
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'fa_IR',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────── //
// No revalidate — tracking data changes frequently; we fetch fresh on every hit.
// The underlying action is not cached, which is correct for a status page.

export default async function TrackPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.trim().toUpperCase();

  // Validate format: BT-XXXXXXXX-XXXXXX (loose check — action handles exact lookup)
  if (!/^BT-[A-F0-9]{8}-[A-F0-9]{6}$/i.test(upper)) {
    notFound();
  }

  const res = await getServiceRequestByTrackingCode(upper);

  // Hard 404 only on truly not-found; let the client show inline error for
  // valid-format codes that just aren't in the DB yet.
  if (!res.success && !res.data) {
    // Pass through to client so user sees a friendly message with a retry option
  }

  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(24px, 5vw, 56px) 16px',
      }}
    >
      <TrackingPageClient
        code={upper}
        initialData={(res.success && res.data) ? res.data : null}
        initialError={!res.success ? (res.message ?? 'خطا') : null}
      />
    </main>
  );
}
