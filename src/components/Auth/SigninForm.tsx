'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { loginUser, sendMagicLink } from '@/actions/auth-actions';
import { LoginSchema } from '@/schemas';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo/Logo';
import SocialProviders from './SocialProviders';
import Loading from '../Button/Loading';
import NcLink from '../NcLink/NcLink';
import type { z } from 'zod';

type FormData = z.infer<typeof LoginSchema>;

export function SigninForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

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
    setFormError(null);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => formData.append(key, value));
      const result = await loginUser(formData);

      if (result?.success) {
        toast({
          title: 'خوش آمدید!',
          description: result.message,
          variant: 'success',
        });
        setTimeout(() => {
          router.push(result.redirect || DEFAULT_REDIRECT);
          router.refresh();
        }, 500);
      } else {
        const message = result?.error || 'خطایی در ورود رخ داده است. لطفاً دوباره تلاش کنید.';
        setFormError(message);
        toast({ title: 'ورود ناموفق', description: message, variant: 'destructive' });
        setIsSubmitting(false);
      }
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'digest' in error &&
        typeof (error as { digest?: string }).digest === 'string' &&
        (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) {
        return;
      }
      console.error('Login error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
      setFormError(message);
      toast({ title: 'خطا', description: message, variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSubmit: SubmitHandler<{ email: string }> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('email', data.email);
      await sendMagicLink(formData);
      toast({
        title: 'لینک جادویی ارسال شد',
        description: 'لطفاً صندوق ورودی ایمیل خود را بررسی کنید.',
        variant: 'success',
      });
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
  };

  return (
    <div className="signin">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">ورود به حساب</h1>
        <p className="text-sm text-muted-foreground">به حساب کاربری خود وارد شوید</p>
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
                <p
                  id="magic-email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
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
              {isSubmitting ? <Loading /> : 'ورود'}
            </Button>
          </form>
        )}

        {(urlError || formError) && (
          <Alert
            variant={urlError ? 'warning' : 'destructive'}
            onDismiss={() => setFormError(null)}
          >
            <AlertTitle>{urlError ? 'توجه' : 'خطای ورود'}</AlertTitle>
            <AlertDescription>{urlError || formError}</AlertDescription>
          </Alert>
        )}

        <Button variant="link" onClick={toggleAuthMethod} className="w-full">
          {showEmailPassword ? 'استفاده از لینک جادویی' : 'استفاده از ایمیل و رمز عبور'}
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
