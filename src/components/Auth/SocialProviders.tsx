import type React from 'react';
import { useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Github, Loader2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { DEFAULT_REDIRECT } from '@/config/routes';

const PROVIDERS = [
  {
    id: 'google' as const,
    label: 'ادامه با گوگل',
    icon: <FcGoogle aria-hidden="true" />,
  },
  {
    id: 'github' as const,
    label: 'ادامه با گیت‌هاب',
    icon: <Github aria-hidden="true" strokeWidth={1.8} />,
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
        setError(`ورود با ${provider === 'google' ? 'گوگل' : 'گیت‌هاب'} ناموفق بود. لطفاً دوباره تلاش کنید.`);
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