/**
 * /transfer — صفحه درخواست حواله ارزی
 * 2026 redesign: Wise/Linear craft level
 */

import TransferRequestCTA from '@/components/money-transfer/TransferRequestCTA';
import { loadActiveTransferProviders } from '@/lib/money-transfer/providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'درخواست حواله | انتقال ارز',
  description: 'ثبت درخواست حواله ارزی به افغانستان، ایران و سراسر جهان با بهترین نرخ',
};

export default async function TransferPage() {
  const activeProviders = await loadActiveTransferProviders();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--ds-canvas)',
        direction: 'rtl',
        fontFamily: 'inherit',
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'oklch(13% 0.05 265)',
          paddingBlock: 'clamp(3.5rem, 9vw, 6.5rem)',
          paddingInline: 'clamp(1rem, 5vw, 3rem)',
        }}
      >
        {/* Ambient layers */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: [
              'radial-gradient(ellipse 80% 60% at 15% 50%, oklch(32% 0.12 265 / 0.18) 0%, transparent 70%)',
              'radial-gradient(ellipse 60% 40% at 85% 20%, oklch(30% 0.10 300 / 0.12) 0%, transparent 70%)',
              'radial-gradient(ellipse 40% 60% at 50% 100%, oklch(20% 0.08 220 / 0.15) 0%, transparent 70%)',
            ].join(','),
            pointerEvents: 'none',
          }}
        />
        {/* Hairline top border */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            insetInline: 0,
            height: '1px',
            background:
              'linear-gradient(90deg, transparent, oklch(55% 0.12 265 / 0.4) 40%, oklch(65% 0.1 280 / 0.3) 60%, transparent)',
          }}
        />

        <div
          style={{
            position: 'relative',
            maxWidth: '700px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 16px',
              borderRadius: '100px',
              background: 'oklch(30% 0.10 265 / 0.35)',
              border: '1px solid oklch(55% 0.12 265 / 0.35)',
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'oklch(78% 0.08 265)',
              marginBottom: '1.5rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'oklch(70% 0.18 145)',
                display: 'inline-block',
                boxShadow: '0 0 8px oklch(70% 0.18 145 / 0.7)',
              }}
              aria-hidden
            />
            سرویس رسمی انتقال ارز
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.2,
              marginBottom: '1.1rem',
              letterSpacing: '-0.02em',
            }}
          >
            ارسال پول به افغانستان
            <span
              style={{
                display: 'block',
                background:
                  'linear-gradient(135deg, oklch(75% 0.16 75) 0%, oklch(72% 0.18 55) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              با بهترین نرخ روز
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
              color: 'oklch(73% 0.04 265)',
              lineHeight: 1.7,
              marginBottom: '2.25rem',
              maxWidth: '520px',
              marginInline: 'auto',
            }}
          >
            بدون کارمزد پنهان، با شفافیت کامل. تیم ما در کمتر از ۳۰ دقیقه پاسخ می‌دهد.
          </p>

          {/* Stats strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'clamp(2rem, 5vw, 4rem)',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
              borderTop: '1px solid oklch(55% 0.06 265 / 0.2)',
            }}
          >
            {[
              {
                value: `${new Intl.NumberFormat('fa-IR').format(activeProviders.length)}+`,
                label: 'صرافی فعال',
              },
              { value: '۲۴/۷', label: 'پشتیبانی آنلاین' },
              { value: '۹۸٪', label: 'رضایت مشتریان' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center', minWidth: '80px' }}>
                <div
                  style={{
                    fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                    fontWeight: 800,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'oklch(60% 0.04 265)',
                    marginTop: '5px',
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main form ──────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '920px',
          margin: '0 auto',
          padding: 'clamp(2.5rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem)',
        }}
      >
        <TransferRequestCTA />
      </section>
    </main>
  );
}
