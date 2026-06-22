'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sendMagicLink } from '@/actions/auth-actions';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Logo from '../Logo/Logo';
import Loading from '../Button/Loading';
import NcLink from '../NcLink/NcLink';
import { z } from 'zod';

const ForgotPasswordSchema = z.object({
  email: z.string().min(1, 'ایمیل الزامی است').email('فرمت ایمیل نامعتبر است'),
});

type FormData = z.infer<typeof ForgotPasswordSchema>;

interface FormState {
  error: string | null;
  success: string | null;
}

export function ForgotPasswordForm() {
  const [formState, setFormState] = useState<FormState>({
    error: null,
    success: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    setFormState({ error: null, success: null });

    try {
      const formData = new FormData();
      formData.append('email', data.email);
      await sendMagicLink(formData);
      setFormState({
        error: null,
        success: 'لینک بازیابی رمز عبور به ایمیل شما ارسال شد.',
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
    <div className="forgot-password">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">فراموشی رمز عبور</h1>
        <p className="text-sm text-muted-foreground">
          ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              placeholder="ایمیل خود را وارد کنید"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loading /> : 'ارسال لینک بازیابی'}
          </Button>
        </form>

        {formState.error && (
          <Alert
            variant="destructive"
            onDismiss={() => setFormState({ error: null, success: null })}
          >
            <AlertTitle>ارسال لینک ناموفق بود</AlertTitle>
            <AlertDescription>{formState.error}</AlertDescription>
          </Alert>
        )}
        {formState.success && (
          <Alert variant="success">
            <AlertTitle>لینک بازیابی ارسال شد ✉️</AlertTitle>
            <AlertDescription>{formState.success}</AlertDescription>
          </Alert>
        )}

        <p className="text-center text-sm text-muted-foreground">
          به یاد آوردید؟{' '}
          <NcLink href="/signin" className="underline">
            ورود به حساب
          </NcLink>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;
