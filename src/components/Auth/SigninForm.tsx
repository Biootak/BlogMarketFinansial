'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '@/components/Input/Input';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import NcLink from '@/components/NcLink/NcLink';
import Logo from '@/components/Logo/Logo';

import { loginUser, sendMagicLink } from '@/actions/auth-actions';
import { LoginSchema } from '@/schemas';
import Loading from '../Button/Loading';
import SocialProviders from '@/components/Auth/SocialProviders';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_REDIRECT } from '@/routes';
import { revalidatePath } from 'next/cache';

type FormData = {
  email: string;
  password: string;
};

interface FormState {
  error: string | null;
  success: string | null;
}

export default function SigninForm() {
  const [formState, setFormState] = useState<FormState>({
    error: null,
    success: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const router = useRouter();

  const searchParams = useSearchParams();
  const urlError =
    searchParams.get('error') === 'OAuthAccountNotLinked'
      ? 'این ایمیل قبلاً با روش دیگری ثبت شده است. لطفاً از همان روش استفاده کنید.'
      : '';

  console.log('urlError:', urlError);
  console.log('error param:', searchParams.get('error'));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setFormState({ error: null, success: null });

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => formData.append(key, value));
      const result = await loginUser(formData);

      if (result.success) {
        setFormState({
          error: null,
          success: result.message || '',
        });

        router.push(DEFAULT_REDIRECT);
        router.refresh();
      } else {
        setFormState({
          error: result.error || 'خطایی در ورود رخ داده است. لطفاً دوباره تلاش کنید.',
          success: null,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setFormState({
        error: error instanceof Error ? error.message : 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.',
        success: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormState({ error: null, success: null });

    try {
      const formData = new FormData();
      formData.append('email', magicLinkEmail);
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

  return (
    <div className="signin">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <p className="text-xl font-medium">خوش آمدید</p>
        <p className="text-small text-default-500">برای ادامه وارد حساب کاربری خود شوید</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="grid gap-1">
          <SocialProviders />
        </div>
        <div className="relative text-center">
          <span className="relative z-10 inline-block px-4 font-medium text-sm bg-white dark:text-neutral-400 dark:bg-neutral-900">
            یا
          </span>
          <div className="absolute left-0 w-full top-1/2 transform -translate-y-1/2 border border-neutral-100 dark:border-neutral-800" />
        </div>

        {!showEmailPassword ? (
          <form onSubmit={handleMagicLinkSubmit} className="grid grid-cols-1 gap-4">
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">ایمیل</span>
              <Input
                type="email"
                name="email"
                placeholder="ایمیل خود را وارد کنید"
                className="mt-1"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                required
              />
            </label>
            <ButtonPrimary type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ارسال...' : 'ارسال لینک یکبار مصرف'}
            </ButtonPrimary>
          </form>
        ) : (
          <form className="grid grid-cols-1 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">ایمیل</span>
              <Input
                {...register('email')}
                type="email"
                placeholder="ایمیل خود را وارد کنید"
                className="mt-1"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </label>
            <label className="block">
              <span className="flex justify-between items-center text-neutral-800 dark:text-neutral-200">
                رمز عبور
                <NcLink href="/forgot-pass" className="text-sm underline">
                  فراموشی رمز عبور؟
                </NcLink>
              </span>
              <Input
                {...register('password')}
                type="password"
                placeholder="رمز عبور خود را وارد کنید"
                className="mt-1"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </label>

            <ButtonPrimary type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loading /> : 'ورود'}
            </ButtonPrimary>
          </form>
        )}

        {(formState.error || urlError) && (
          <p className="text-red-500 text-center">{formState.error || urlError}</p>
        )}
        {formState.success && <p className="text-green-500 text-center">{formState.success}</p>}

        <button
          type="button"
          onClick={() => setShowEmailPassword(!showEmailPassword)}
          className="text-sm text-blue-500 hover:underline cursor-pointer block mx-auto"
        >
          {showEmailPassword ? 'استفاده از لینک یکبار مصرف' : 'استفاده از ایمیل و رمز عبور'}
        </button>

        <span className="block text-center text-neutral-700 dark:text-neutral-400">
          حساب کاربری ندارید؟
          <NcLink className="text-sm p-1" href="/signup">
            ثبت نام
          </NcLink>
        </span>
      </div>
    </div>
  );
}
