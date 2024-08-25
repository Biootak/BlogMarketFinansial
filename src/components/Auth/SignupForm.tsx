'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '@/components/Input/Input';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import NcLink from '@/components/NcLink/NcLink';
import Logo from '@/components/Logo/Logo';
import SocialProviders from '@/components/Auth/SocialProviders';
import { RegisterSchema } from '@/schemas';
import { sendMagicLink, registerUser } from '@/actions/auth-actions';
import Loading from '@/components/Button/Loading';

type FormData = {
  name: string;
  email: string;
  password: string;
};

interface FormState {
  error: string | null;
  success: string | null;
}

export default function SignupForm() {
  const [formState, setFormState] = useState<FormState>({
    error: null,
    success: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: FormData) => {
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

  return (
    <div className="signup">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <p className="text-xl font-medium">ایجاد حساب کاربری</p>
        <p className="text-small text-default-500">برای استفاده از خدمات ما، لطفاً ثبت‌نام کنید</p>
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
              {isSubmitting ? <Loading /> : 'ارسال لینک یکبار مصرف'}
            </ButtonPrimary>
          </form>
        ) : (
          <form className="grid grid-cols-1 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">نام</span>
              <Input
                {...register('name')}
                type="text"
                placeholder="نام خود را وارد کنید"
                className="mt-1"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </label>
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
              <span className="text-neutral-800 dark:text-neutral-200">رمز عبور</span>
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
              {isSubmitting ? <Loading /> : 'ثبت‌نام'}
            </ButtonPrimary>
          </form>
        )}

        {formState.error && <p className="text-red-500 text-center">{formState.error}</p>}
        {formState.success && <p className="text-green-500 text-center">{formState.success}</p>}

        <button
          type="button"
          onClick={() => setShowEmailPassword(!showEmailPassword)}
          className="text-sm text-blue-500 hover:underline cursor-pointer block mx-auto"
        >
          {showEmailPassword ? 'استفاده از لینک یکبار مصرف' : 'استفاده از ایمیل و رمز عبور'}
        </button>

        <span className="block text-center text-neutral-700 dark:text-neutral-400">
          قبلاً ثبت‌نام کرده‌اید؟
          <NcLink className="text-sm p-1" href="/signin">
            ورود به حساب
          </NcLink>
        </span>
      </div>
    </div>
  );
}