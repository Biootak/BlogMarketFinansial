'use client';

import type React from 'react';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { DEFAULT_REDIRECT } from '@/config/routes';
import Loading from '@/components/Button/Loading';

const SocialProviders: React.FC = () => {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (provider: 'google' | 'github') => {
    const setLoading = provider === 'google' ? setIsLoadingGoogle : setIsLoadingGithub;
    try {
      setLoading(true);
      setError(null);

      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: DEFAULT_REDIRECT,
      });

      if (result?.error) {
        setError(`خطا در ورود با ${provider === 'google' ? 'گوگل' : 'گیتهاب'}`);
      }
    } catch (err) {
      setError('خطای غیرمنتظره رخ داد');
      console.error(`خطا در ورود با ${provider}:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleLogin('google')}
          disabled={isLoadingGoogle}
          aria-label="ورود با گوگل"
          className="w-full"
        >
          {isLoadingGoogle ? (
            <Loading size="md" variant="primary" type="spinner" />
          ) : (
            <FcGoogle className=" h-5 w-5" />
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => handleLogin('github')}
          disabled={isLoadingGithub}
          aria-label="ورود با گیتهاب"
          className="w-full"
        >
          {isLoadingGithub ? (
            <Loading size="md" variant="primary" type="spinner" />
          ) : (
            <FaGithub className=" h-5 w-5" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-red-500 mt-2 text-center" >
          {error}
        </p>
      )}
    </div>
  );
};

export default SocialProviders;
