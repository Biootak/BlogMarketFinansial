import { DEFAULT_REDIRECT } from '@/config/routes';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type React from 'react';
import { useMemo, useState } from 'react';
// 2026-06-30: switched from a mix of `FcGoogle` (react-icons/fc, 1em,
// colorful filled) + `Github` (lucide-react, 24px, monochrome outline)
// to a single icon family — Simple Icons. Both now share the same
// 24x24 viewBox, the same monochrome fill style, and inherit the
// button's `currentColor`, so the two brand marks render at identical
// visual weight. CSS in auth.css also locks the rendered size to
// 1.25rem so any future icon swap can't reintroduce drift.
import { SiGithub, SiGoogle } from 'react-icons/si';

const PROVIDERS = [
  {
    id: 'google' as const,
    label: 'ادامه با گوگل',
    icon: <SiGoogle aria-hidden="true" />,
  },
  {
    id: 'github' as const,
    label: 'ادامه با گیت‌هاب',
    icon: <SiGithub aria-hidden="true" />,
  },
];

const SocialProviders: React.FC = () => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => loadingProvider !== null, [loadingProvider]);

  const handleLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider);
      setError(null);

      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: DEFAULT_REDIRECT,
      });

      if (result?.error) {
        setError(
          `ورود با ${provider === 'google' ? 'گوگل' : 'گیت‌هاب'} ناموفق بود. لطفاً دوباره تلاش کنید.`,
        );
        return;
      }

      if (result?.url) {
        window.location.assign(result.url);
      }
    } catch (err) {
      setError('اتصال به سرویس احراز هویت ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.');
      console.error(`Social sign-in (${provider}) failed:`, err);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="auth-social-stack" role="group" aria-label="ورود با ارائه‌دهنده‌های اجتماعی">
      {PROVIDERS.map((provider) => {
        const busy = loadingProvider === provider.id;

        return (
          <button
            key={provider.id}
            type="button"
            className="auth-social-btn"
            onClick={() => handleLogin(provider.id)}
            disabled={disabled}
            aria-label={provider.label}
            aria-busy={busy || undefined}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : provider.icon}
            <span>{provider.label}</span>
          </button>
        );
      })}

      {error ? <p className="auth-error auth-error--center">{error}</p> : null}
    </div>
  );
};

export default SocialProviders;
