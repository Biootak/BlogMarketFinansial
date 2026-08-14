'use client';

/**
 * ConnectedAccountsClient — مدیریت اتصال گوگل/گیت‌هاب به حساب کاربر.
 *
 * اتصال: signIn(provider) → OAuth dance → callbacks.signIn (سرور) چون کاربرِ
 * لاگین‌شده است و ایمیل provider با ایمیل حسابش یکی است، linking را تأیید
 * می‌کند. اگر ایمیل‌ها یکی نباشند، با error=… به همین صفحه برمی‌گردد.
 *
 * قطع اتصال: ConfirmDialog → اکشن سرور unlinkOAuthAccount (گارد آخرین روش ورود).
 */

import type { LinkedAccountsState, OAuthProvider } from '@/actions/accountLinksActions';
import { unlinkOAuthAccount } from '@/actions/accountLinksActions';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Loader2, Mail, Unplug } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { SiGithub, SiGoogle } from 'react-icons/si';
import s from './ConnectedAccountsClient.module.css';

type Props = {
  initial: LinkedAccountsState;
};

const PROVIDERS: ReadonlyArray<{
  id: OAuthProvider;
  label: string;
  shortName: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'google',
    label: 'گوگل',
    shortName: 'گوگل',
    description: 'ورود سریع با حساب Google شما',
    icon: <SiGoogle aria-hidden="true" />,
  },
  {
    id: 'github',
    label: 'گیت‌هاب',
    shortName: 'گیت‌هاب',
    description: 'ورود سریع با حساب GitHub شما',
    icon: <SiGithub aria-hidden="true" />,
  },
];

// خطاهای برگشتی از callbacks.signIn هنگام مسیر اتصال (dashboard/connected-accounts?error=…)
const ERROR_MESSAGES: Record<string, string> = {
  'oauth-email-unverified':
    'این حساب گوگل/گیت‌هاب ایمیلی تأییدنشده دارد؛ نمی‌توان آن را به این حساب وصل کرد.',
  'oauth-email-mismatch':
    'ایمیل این حساب گوگل/گیت‌هاب به کاربر دیگری در سامانه تعلق دارد؛ برای جلوگیری از ادغام دو حساب، اتصال انجام نشد.',
  'oauth-account-taken':
    'این حساب گوگل/گیت‌هاب قبلاً به کاربر دیگری وصل شده است. ابتدا آن را از حساب قبلی جدا کنید.',
  'account-blocked': 'دسترسی به این حساب غیرفعال شده است.',
};

export function ConnectedAccountsClient({ initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState<OAuthProvider | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<OAuthProvider | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const linkedProviders = useMemo(
    () => new Set(initial.accounts.map((a) => a.provider)),
    [initial.accounts],
  );

  // notice از searchParams (خطای برگشتی از سرور بعد از OAuth callback)
  const urlError = searchParams.get('error');
  const urlNotice = urlError && ERROR_MESSAGES[urlError] ? ERROR_MESSAGES[urlError] : null;

  const handleConnect = async (provider: OAuthProvider) => {
    try {
      setConnecting(provider);
      setConnectError(null);
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: '/dashboard/connected-accounts',
      });
      if (result?.error) {
        setConnectError(`اتصال به ${PROVIDERS.find((p) => p.id === provider)?.label} ناموفق بود.`);
        return;
      }
      if (result?.url) {
        window.location.assign(result.url);
      }
    } catch (_err) {
      setConnectError('اتصال به سرویس احراز هویت ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.');
    } finally {
      setConnecting(null);
    }
  };

  const handleUnlink = (provider: OAuthProvider) => {
    startTransition(async () => {
      setActionError(null);
      const result = await unlinkOAuthAccount(provider);
      setUnlinkTarget(null);
      if (!result.success) {
        setActionError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className={s.root}>
      {/* ── Notices ── */}
      {urlNotice && (
        <div className={cn(s.notice, s.noticeError)} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{urlNotice}</span>
        </div>
      )}
      {connectError && (
        <div className={cn(s.notice, s.noticeError)} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{connectError}</span>
        </div>
      )}
      {actionError && (
        <div className={cn(s.notice, s.noticeError)} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}
      {!initial.hasPassword && (
        <div className={cn(s.notice, s.noticeWarn)}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            حساب شما هنوز رمز عبور ندارد. تا وقتی یک روش ورود دیگر (رمز عبور یا حساب متصل) نداشته
            باشید، امکان قطع اتصال آخرین روش وجود ندارد.
          </span>
        </div>
      )}

      {/* ── Provider cards ── */}
      <div className={s.grid}>
        {PROVIDERS.map((provider) => {
          const linked = linkedProviders.has(provider.id);
          const busy = connecting === provider.id;
          return (
            <div key={provider.id} className={cn(s.card, linked && s.cardLinked)}>
              <div className={s.cardHead}>
                <span className={cn(s.brandIcon, linked && s.brandIconLinked)} aria-hidden>
                  {provider.icon}
                </span>
                <div>
                  <h3 className={s.providerName}>{provider.label}</h3>
                  <p className={s.providerDesc}>{provider.description}</p>
                </div>
                <output className={cn(s.statusPill, linked ? s.statusLinked : s.statusUnlinked)}>
                  {linked ? (
                    <>
                      <Check size={12} aria-hidden="true" /> متصل
                    </>
                  ) : (
                    'قطع'
                  )}
                </output>
              </div>

              <div className={s.cardFoot}>
                {linked ? (
                  <button
                    type="button"
                    className={s.unlinkBtn}
                    onClick={() => setUnlinkTarget(provider.id)}
                    disabled={pending}
                  >
                    <Unplug size={14} aria-hidden="true" />
                    قطع اتصال
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.linkBtn}
                    onClick={() => handleConnect(provider.id)}
                    disabled={connecting !== null}
                    aria-busy={busy || undefined}
                  >
                    {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    {busy ? 'در حال اتصال…' : `اتصال با ${provider.label}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ایمیل حساب ── */}
      <div className={s.emailRow}>
        <Mail size={15} aria-hidden="true" />
        <span>
          ورود با گوگل/گیت‌هاب روی همین حساب (
          <strong className={s.emailStrong}>{initial.email || 'حساب شما'}</strong>) انجام می‌شود —
          حتی اگر ایمیل آن سرویس متفاوت باشد.
        </span>
      </div>

      {/* ── Confirm unlink ── */}
      <ConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        variant="caution"
        title="قطع اتصال حساب"
        description={
          unlinkTarget
            ? `آیا از قطع اتصال «${PROVIDERS.find((p) => p.id === unlinkTarget)?.label}» مطمئن هستید؟ بعد از این، ورود با این روش دیگر ممکن نیست.`
            : undefined
        }
        confirmLabel="بله، قطع کن"
        cancelLabel="انصراف"
        loading={pending}
        onConfirm={() => {
          if (unlinkTarget) handleUnlink(unlinkTarget);
        }}
      />
    </div>
  );
}
