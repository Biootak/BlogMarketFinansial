'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sendMagicLink } from '@/actions/auth-actions';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo/Logo';
import Loading from '../Button/Loading';
import NcLink from '../NcLink/NcLink';
import { z } from 'zod';

const ForgotPasswordSchema = z.object({
  email: z.string().min(1, 'ایمیل الزامی است').email('فرمت ایمیل صحیح نیست'),
});

type FormData = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
    setFormError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('email', data.email);
      await sendMagicLink(formData);
      const message = 'لینک بازنشانی رمز عبور به ایمیل شما ارسال شد.';
      setSuccessMessage(message);
      toast({ title: 'ایمیل ارسال شد', description: message, variant: 'success' });
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

  return (
    <div className="forgot-password">
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">فراموشی رمز عبور</h1>
        <p className="text-sm text-muted-foreground">
          ایمیل خود را وارد کنید تا لینک بازنشانی رمز عبور را دریافت کنید
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loading /> : 'ارسال لینک بازنشانی'}
          </Button>
        </form>

        {(formError || successMessage) && (
          <Alert
            variant={successMessage ? 'success' : 'destructive'}
            onDismiss={() => {
              setFormError(null);
              setSuccessMessage(null);
            }}
          >
            <AlertTitle>{successMessage ? 'عملیات موفق' : 'خطا'}</AlertTitle>
            <AlertDescription>{successMessage || formError}</AlertDescription>
          </Alert>
        )}

        <p className="text-center text-sm text-muted-foreground">
          رمز عبور خود را به یاد دارید؟{' '}
          <NcLink href="/signin" className="underline">
            وارد شوید
          </NcLink>
        </p>
      </div>
    </div>
  );
}
