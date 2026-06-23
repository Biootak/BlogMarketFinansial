'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RegisterSchema } from '@/schemas';
import { sendMagicLink, registerUser } from '@/actions/auth-actions';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import Logo from '../Logo/Logo';
import SocialProviders from './SocialProviders';
import Loading from '../Button/Loading';
import NcLink from '../NcLink/NcLink';
import type { z } from 'zod';

type FormData = z.infer<typeof RegisterSchema>;

export function SignupForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

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
    setFormError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => formData.append(key, value));
      const result = await registerUser(formData);

      if (result?.success) {
        const message = result.message || 'ثبت‌نام شما با موفقیت انجام شد.';
        setSuccessMessage(message);
        toast({ title: 'ثبت‌نام موفق', description: message, variant: 'success' });
      } else {
        const message = result?.error || 'خطایی در ثبت‌نام رخ داده است. لطفاً دوباره تلاش کنید.';
        setFormError(message);
        toast({ title: 'ثبت‌نام ناموفق', description: message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message =
        error instanceof Error ? error.message : 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
      setFormError(message);
      toast({ title: 'خطا', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSubmit: SubmitHandler<{ email: string }> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('email', data.email);
      await sendMagicLink(formData);
      const message = 'لینک ورود به ایمیل شما ارسال شد.';
      setSuccessMessage(message);
      toast({ title: 'لینک ارسال شد', description: message, variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'ارسال لینک با خطا مواجه شد. لطفاً دوباره تلاش کنید.';
      setFormError(message);
      toast({ title: 'خطا', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAuthMethod = () => {
    setShowEmailPassword(!showEmailPassword);
    reset();
    setFormError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="signup">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">ایجاد حساب کاربری</h1>
        <p className="text-sm text-muted-foreground">به جمع ما بپیوندید و از خدمات ما بهره‌مند شوید</p>
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
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'magic-email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="magic-email-error" role="alert" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loading /> : 'ارسال لینک جادویی'}
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
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name')}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                placeholder="ایمیل خود را وارد کنید"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="رمز عبور خود را وارد کنید"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" role="alert" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loading /> : 'ثبت‌نام'}
            </Button>
          </form>
        )}

        {/* 2026-06-23: alert فقط برای پیام متنی طولانی که کاربر باید بخواند. */}
        {(urlError || formError) && (
          <Alert
            variant={urlError ? 'warning' : 'destructive'}
            onDismiss={() => setFormError(null)}
          >
            <AlertTitle>{urlError ? 'توجه' : 'خطای ثبت‌نام'}</AlertTitle>
            <AlertDescription>{urlError || formError}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            <AlertTitle>عملیات موفق</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Button variant="link" onClick={toggleAuthMethod} className="w-full">
          {showEmailPassword ? 'استفاده از لینک جادویی' : 'استفاده از ایمیل و رمز عبور'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <NcLink href="/signin" className="underline">
            وارد شوید
          </NcLink>
        </p>
      </div>
    </div>
  );
}
