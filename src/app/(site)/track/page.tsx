/**
 * /track — صفحه‌ی ورود کد پیگیری معامله
 *
 * کاربر بدون کد پیگیری به /track می‌آید.
 * اگر query ?code= موجود باشد → redirect به /track/[code]
 * در غیر این صورت → فرم ورود کد.
 *
 * Server Component — بدون client-side JS.
 */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import s from './[code]/track.module.css';

export const metadata: Metadata = {
  title: 'پیگیری معامله | کیف پول دیجیتال',
  description: 'کد پیگیری معامله خود را وارد کنید تا وضعیت لحظه‌ای آن را ببینید.',
  robots: { index: false },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TrackIndexPage({ searchParams }: Props) {
  const sp = await searchParams;
  const codeParam = typeof sp.code === 'string' ? sp.code.trim().toUpperCase() : '';
  if (codeParam) {
    redirect(`/track/${encodeURIComponent(codeParam)}`);
  }

  return (
    <main className={s.page} dir="rtl">
      <section className={s.hero} aria-label="پیگیری معامله">
        <div className={s.heroAmbient} aria-hidden />
        <div className={s.heroHairline} aria-hidden />
        <div className={s.heroInner}>
          <div className={`${s.heroBadge} ${s.statusPending}`}>
            <span className={s.heroBadgeDot} aria-hidden />
            <Search size={12} strokeWidth={2} aria-hidden />
            پیگیری معامله
          </div>
          <h1 className={s.heroTitle}>وضعیت معامله</h1>
          <p
            style={{
              color: 'var(--ds-text-muted)',
              fontSize: 'var(--ds-text-sm)',
              margin: 0,
              maxWidth: '36ch',
              textAlign: 'center',
            }}
          >
            کد پیگیری‌ای که هنگام ثبت معامله دریافت کردید را وارد کنید.
          </p>
        </div>
      </section>

      <div className={s.content}>
        <section
          className={s.summaryCard}
          aria-label="ورود کد پیگیری"
          style={{ maxWidth: '28rem', marginInline: 'auto' }}
        >
          <form
            method="GET"
            action="/track"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
              <label
                htmlFor="track-code"
                style={{ fontSize: 'var(--ds-text-sm)', fontWeight: 600, color: 'var(--ds-text)' }}
              >
                کد پیگیری
              </label>
              <Input
                id="track-code"
                name="code"
                type="text"
                placeholder="مثال: ABCD-1234"
                dir="ltr"
                required
                minLength={4}
                maxLength={24}
                autoComplete="off"
                style={{ textAlign: 'center', letterSpacing: '0.12em' }}
              />
              <p style={{ fontSize: 'var(--ds-text-xs)', color: 'var(--ds-text-muted)', margin: 0 }}>
                کد پیگیری در ایمیل تأیید معامله یا داشبورد «معاملات من» موجود است.
              </p>
            </div>
            <Button type="submit" className="w-full gap-2">
              <Search size={16} strokeWidth={2} aria-hidden />
              پیگیری وضعیت
            </Button>
          </form>
        </section>

        <div className={s.backRow}>
          <Link href="/money-transfer" className={s.backLink}>
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
            بازگشت به صفحه انتقال
          </Link>
        </div>
      </div>
    </main>
  );
}
