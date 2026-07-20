/**
 * /transfer — صفحه درخواست حواله ارزی
 *
 * این صفحه ورودی اصلی کاربر برای ثبت درخواست انتقال وجه است.
 * از کامپوننت‌های موجود money-transfer استفاده می‌کند.
 */

import TransferRequestCTA from '@/components/money-transfer/TransferRequestCTA';
import { loadActiveTransferProviders } from '@/lib/money-transfer/providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'درخواست حواله | انتقال ارز',
  description: 'ثبت درخواست حواله ارزی به افغانستان، ایران و سراسر جهان با بهترین نرخ',
};

export default async function TransferPage() {
  // loadActiveTransferProviders فقط providerهای active برمی‌گرداند — filter مجدد حذف شد
  const activeProviders = await loadActiveTransferProviders();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--ds-canvas)',
        direction: 'rtl',
      }}
    >
      {/* Hero section */}
      <section
        style={{
          background: 'linear-gradient(135deg, oklch(20% 0.06 265) 0%, oklch(15% 0.08 275) 100%)',
          padding: 'clamp(3rem, 8vw, 6rem) 1.5rem clamp(2rem, 5vw, 4rem)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background pattern */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, oklch(35% 0.12 265 / 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, oklch(35% 0.10 280 / 0.10) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '20px',
              background: 'oklch(35% 0.12 265 / 0.25)',
              border: '1px solid oklch(55% 0.12 265 / 0.3)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'oklch(80% 0.08 265)',
              marginBottom: '1.25rem',
              letterSpacing: '0.04em',
            }}
          >
            <span>●</span> سریع · امن · معتبر
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.25,
              marginBottom: '1rem',
            }}
          >
            ارسال پول به
            <span
              style={{
                display: 'block',
                color: 'oklch(75% 0.15 75)',
                fontStyle: 'italic',
              }}
            >
              افغانستان و ایران
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
              color: 'oklch(78% 0.04 265)',
              lineHeight: 1.65,
              marginBottom: '2rem',
            }}
          >
            با بهترین نرخ روز، بدون کارمزد پنهان — درخواست خود را ثبت کنید
          </p>

          {/* Stats strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'clamp(1.5rem, 4vw, 3rem)',
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                value: `${new Intl.NumberFormat('fa-IR').format(activeProviders.length)}+`,
                label: 'صرافی فعال',
              },
              { value: '۲۴/۷', label: 'پشتیبانی آنلاین' },
              { value: '۹۹٪', label: 'رضایت مشتریان' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 'clamp(1.4rem, 3vw, 1.85rem)',
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
                    color: 'oklch(65% 0.04 265)',
                    marginTop: '4px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2rem)',
        }}
      >
        {/* Active providers */}
        {activeProviders.length > 0 && (
          <div
            style={{
              background: 'var(--ds-canvas-subtle, #f7f8fa)',
              border: '1px solid var(--ds-border)',
              borderRadius: '16px',
              padding: 'var(--ds-space-5, 1.25rem)',
              marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--ds-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}
            >
              صرافی‌های طرف قرارداد
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {activeProviders.slice(0, 8).map((p) => (
                <span
                  key={p.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'var(--ds-canvas)',
                    border: '1px solid var(--ds-border)',
                    color: 'var(--ds-text)',
                  }}
                >
                  <span style={{ color: 'oklch(60% 0.15 145)', fontSize: '10px' }}>●</span>
                  {p.name}
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--ds-text-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p.spreadPercent.toFixed(1)}٪
                  </span>
                </span>
              ))}
              {activeProviders.length > 8 && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: 'var(--ds-text-secondary)',
                    background: 'var(--ds-canvas)',
                    border: '1px solid var(--ds-border)',
                  }}
                >
                  +{new Intl.NumberFormat('fa-IR').format(activeProviders.length - 8)} صرافی دیگر
                </span>
              )}
            </div>
          </div>
        )}

        {/* Transfer Request Form */}
        <TransferRequestCTA />
      </section>

      {/* Trust & Info section */}
      <section
        style={{
          background: 'var(--ds-canvas-subtle, #f7f8fa)',
          borderTop: '1px solid var(--ds-border)',
          padding: 'clamp(2rem, 5vw, 3rem) 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '860px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(1.25rem, 3vw, 2rem)',
          }}
        >
          {[
            {
              icon: '🔒',
              title: 'انتقال امن',
              desc: 'تمام تراکنش‌ها رمزنگاری‌شده و مطابق با قوانین مالی انجام می‌شود.',
            },
            {
              icon: '⚡',
              title: 'سریع و قابل اعتماد',
              desc: 'انتقال وجه در کمترین زمان ممکن با تأیید آنی از طریق پیامک.',
            },
            {
              icon: '💸',
              title: 'بهترین نرخ',
              desc: 'نرخ‌های رقابتی با شفافیت کامل — بدون هزینه‌های پنهان.',
            },
            {
              icon: '🌍',
              title: 'پوشش گسترده',
              desc: 'ارسال پول به افغانستان، ایران، امارات و سایر کشورها.',
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{item.icon}</span>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--ds-text)',
                  margin: 0,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--ds-text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
