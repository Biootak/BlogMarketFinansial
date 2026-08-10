'use client';

import { getEnabledSocialProviders } from '@/actions/auth-actions';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
// 2026-06-30: switched from a mix of `FcGoogle` (react-icons/fc, 1em,
// colorful filled) + `Github` (lucide-react, 24px, monochrome outline)
// to a single icon family — Simple Icons. Both now share the same
// 24x24 viewBox, the same monochrome fill style, and inherit the
// button's `currentColor`, so the two brand marks render at identical
// visual weight. CSS in auth.css also locks the rendered size to
// 1.25rem so any future icon swap can't reintroduce drift.
import { SiGithub, SiGoogle } from 'react-icons/si';

const PROVIDER_META = {
  google: {
    label: 'ادامه با گوگل',
    shortName: 'گوگل',
    icon: <SiGoogle aria-hidden="true" />,
  },
  github: {
    label: 'ادامه با گیت‌هاب',
    shortName: 'گیت‌هاب',
    icon: <SiGithub aria-hidden="true" />,
  },
} as const;

type SocialProviderId = keyof typeof PROVIDER_META;

// 2026-08-10: ورود اجتماعی فقط در production فعال است. فهرست provider ها را
// از سرور می‌گیریم (NODE_ENV + وجود credential ها در runtime) نه از client —
// چون AUTH_* فقط سمت سرور در دسترس است و در dev نباید دکمه‌ای نمایش داده
// شود که خطا می‌دهد.
const SocialProviders: React.FC = () => {
  const [enabled, setEnabled] = useState<SocialProviderId[] | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<SocialProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEnabledSocialProviders()
      .then((providers) => {
        if (cancelled) return;
        setEnabled(providers.filter((p): p is SocialProviderId => p in PROVIDER_META));
      })
      .catch(() => {
        if (!cancelled) setEnabled([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const disabled = useMemo(() => loadingProvider !== null, [loadingProvider]);

  const handleLogin = async (provider: SocialProviderId) => {
    try {
      setLoadingProvider(provider);
      setError(null);

      // احترام به callbackUrl از URL (که middleware موقع redirect به /auth
      // می‌فرستد) — به‌جای DEFAULT_REDIRECT ثابت. اگر نباشد، همان dashboard.
      const urlCallback = searchParams.get('callbackUrl');
      const callbackUrl =
        urlCallback && urlCallback.startsWith('/') ? urlCallback : DEFAULT_REDIRECT;
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(`ورود با ${PROVIDER_META[provider].shortName} ناموفق بود. لطفاً دوباره تلاش کنید.`);
        return;
      }

      if (result?.url) {
        window.location.assign(result.url);
      }
    } catch (_err) {
      setError('اتصال به سرویس احراز هویت ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // هنوز جواب سرور نیامده یا هیچ provider ای فعال نیست → چیزی نمایش نده
  // (بدون فلش شدن دکمه‌ها قبل از جواب action).
  if (!enabled || enabled.length === 0) {
    return null;
  }

  return (
    <div className="auth-social-stack" role="group" aria-label="ورود با ارائه‌دهنده‌های اجتماعی">
      {enabled.map((provider) => {
        const busy = loadingProvider === provider;
        const meta = PROVIDER_META[provider];

        return (
          <button
            key={provider}
            type="button"
            className="auth-social-btn"
            onClick={() => handleLogin(provider)}
            disabled={disabled}
            aria-label={meta.label}
            aria-busy={busy || undefined}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : meta.icon}
            <span>{meta.label}</span>
          </button>
        );
      })}

      {error ? <p className="auth-error auth-error--center">{error}</p> : null}
    </div>
  );
};

export default SocialProviders;
