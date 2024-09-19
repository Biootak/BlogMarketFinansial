'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RegisterSchema } from '@/schemas';
import { sendMagicLink, registerUser } from '@/actions/auth-actions';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSearchParams } from 'next/navigation';
import Logo from '../Logo/Logo';
import SocialProviders from './SocialProviders';
import Loading from '../Button/Loading';
import NcLink from '../NcLink/NcLink';
import type { z } from 'zod';

type FormData = z.infer<typeof RegisterSchema>;

interface FormState {
  error: string | null;
  success: string | null;
}

export function SignupForm() {
  const [formState, setFormState] = useState<FormState>({
    error: null,
    success: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const searchParams = useSearchParams();
  const urlError =
    searchParams.get('error') === 'OAuthAccountNotLinked'
      ? 'این ایمیل قبلاً با روش دیگری ثبت شده است. لطفاً از همان روش استفاده کنید.'
      : '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    setFormState({ error: null, success: null });

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => formData.append(key, value));
      const result = await registerUser(formData);

      if (result.success) {
        setFormState({
          error: null,
          success: result.message || 'ثبت‌نام شما با موفقیت انجام شد.',
        });
      } else {
        setFormState({
          error: result.error || 'خطایی در ثبت‌نام رخ داده است. لطفاً دوباره تلاش کنید.',
          success: null,
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setFormState({
        error: error instanceof Error ? error.message : 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.',
        success: null,
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
        success: 'لینک ثبت‌نام به ایمیل شما ارسال شد.',
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
    <div className="signup">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">ایجاد حساب کاربری</h1>
        <p className="text-sm text-muted-foreground">برای استفاده از خدمات ما، لطفاً ثبت‌نام کنید</p>
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
              <Label htmlFor="name">نام</Label>
              <Input
                id="name"
                type="text"
                placeholder="نام خود را وارد کنید"
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
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
              <Label htmlFor="password">رمز عبور</Label>
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
              {isSubmitting ? <Loading /> : 'ثبت‌نام'}
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
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <NcLink href="/signin" className="underline">
            ورود به حساب
          </NcLink>
        </p>
      </div>
    </div>
  );
}
