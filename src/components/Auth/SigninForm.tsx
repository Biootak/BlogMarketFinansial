'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';
import { LoginSchema } from '@/schemas';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '../Logo/Logo';
import SocialProviders from './SocialProviders';
import Loading from '../Button/Loading';
import NcLink from '../NcLink/NcLink';
import type { z } from 'zod';
import { CacheService } from '@/services/cacheService';

import { auth } from '@/auth';
import { toast } from '../ui/use-toast';
import { sendMagicLink } from '@/actions/auth-actions';

type FormData = z.infer<typeof LoginSchema>;

interface FormState {
  error: string | null;
  success: string | null;
}

export function SigninForm() {
  const [formState, setFormState] = useState<FormState>({
    error: null,
    success: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const urlError =
    searchParams.get('error') === 'OAuthAccountNotLinked'
      ? 'این ایمیل قبلاً با روش دیگری ثبت شده است. لطفاً از همان روش استفاده کنید.'
      : '';

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(DEFAULT_REDIRECT);
        router.refresh();
        toast({
          title: 'موفقیت',
          description: 'شما با موفقیت وارد شدید',
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: 'ایمیل یا رمز عبور اشتباه است',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('خطا در ورود:', error);
      toast({
        title: 'خطا',
        description: 'مشکلی در ورود رخ داد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSubmit: SubmitHandler<{ email: string }> = async (data) => {
    setIsSubmitting(true);
    setFormState({ error: null, success: null });

    try {
      const formData = new FormData();
      formData.append('email', data.email);
      await sendMagicLink(formData);
      setFormState({
        error: null,
        success: 'لینک ورود به ایمیل شما ارسال شد.',
      });
    } catch (error) {
      setFormState({
        error:
          error instanceof Error
            ? error.message
            : 'متأسفانه خطایی رخ داده است. لطفاً دوباره تلاش کنید.',
        success: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAuthMethod = () => {
    setShowEmailPassword(!showEmailPassword);
    reset();
    setFormState({ error: null, success: null });
  };

  return (
    <div className="signin">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">خوش آمدید</h1>
        <p className="text-sm text-muted-foreground">برای ادامه وارد حساب کاربری خود شوید</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <SocialProviders />

        <div className="relative text-center">
          <span className="relative z-10 inline-block px-4 font-medium text-sm bg-background">
            یا
          </span>
          <div className="absolute left-0 w-full top-1/2 transform -translate-y-1/2 border-t" />
        </div>

        {!showEmailPassword ? (
          <form onSubmit={handleSubmit(handleMagicLinkSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-link-email">ایمیل</Label>
              <Input
                id="magic-link-email"
                type="email"
                placeholder="ایمیل خود را وارد کنید"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loading /> : 'ارسال لینک یکبار مصرف'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                placeholder="ایمیل خود را وارد کنید"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">رمز عبور</Label>
                <NcLink href="/forgot-pass" className="text-sm underline">
                  فراموشی رمز عبور
                </NcLink>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="رمز عبور خود را وارد کنید"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loading /> : 'ورود'}
            </Button>
          </form>
        )}

        {urlError && (
          <Alert variant="warning">
            <AlertDescription>{urlError}</AlertDescription>
          </Alert>
        )}
        {formState.error && (
          <Alert variant="destructive">
            <AlertDescription>{formState.error}</AlertDescription>
          </Alert>
        )}
        {formState.success && (
          <Alert variant="success">
            <AlertDescription>{formState.success}</AlertDescription>
          </Alert>
        )}

        <Button variant="link" onClick={toggleAuthMethod} className="w-full">
          {showEmailPassword ? 'استفاده از لینک یکبار مصرف' : 'استفاده از ایمیل و رمز عبور'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          حساب کاربری ندارید؟{' '}
          <NcLink href="/signup" className="underline">
            ثبت نام
          </NcLink>
        </p>
      </div>
    </div>
  );
}
