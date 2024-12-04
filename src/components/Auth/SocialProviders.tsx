'use client';

import type React from 'react';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { DEFAULT_REDIRECT } from '@/config/routes';
import Loading from '@/components/Button/Loading';
import { getSession } from 'next-auth/react';
import { CacheService } from '@/services/cacheService';
import { useRouter } from 'next/router';
import { toast } from '../ui/use-toast';


const SocialProviders: React.FC = () => {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSocialLogin = async (provider: string) => {
    try {
      setError(null); // Reset error state before attempting login
      
      // Set loading state based on provider
      if (provider === 'google') {
        setIsLoadingGoogle(true);
      } else if (provider === 'github') {
        setIsLoadingGithub(true);
      }

      const result = await signIn(provider, { redirect: false });
      
      if (result?.ok) {
        // پاک کردن کش کاربر بعد از لاگین
        const session = await getSession();
        if (session?.user?.id) {
          await CacheService.invalidateUserProfile(session.user.id);
        }

        router.push(DEFAULT_REDIRECT);
        router.push(router.asPath);
        toast({
          title: 'موفقیت',
          description: 'شما با موفقیت وارد شدید',
          variant: 'success',
        });
      } else {
        setError('مشکلی در ورود با حساب اجتماعی رخ داد');
        toast({
          title: 'خطا',
          description: 'مشکلی در ورود با حساب اجتماعی رخ داد',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setError('مشکلی در ورود با حساب اجتماعی رخ داد. لطفاً دوباره تلاش کنید.');
      console.error('خطا در ورود با حساب اجتماعی:', error);
      toast({
        title: 'خطا',
        description: 'مشکلی در ورود با حساب اجتماعی رخ داد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      // Reset loading states
      if (provider === 'google') {
        setIsLoadingGoogle(false);
      } else if (provider === 'github') {
        setIsLoadingGithub(false);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleSocialLogin('google')}
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
          onClick={() => handleSocialLogin('github')}
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
