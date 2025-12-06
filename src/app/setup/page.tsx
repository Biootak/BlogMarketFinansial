'use client';

import { createSuperAdmin } from '@/actions/createSuperAdmin';
import { InlineLoadingSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const setupSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل 2 حرف داشته باشد'),
  email: z.string().email('لطفاً یک آدرس ایمیل معتبر وارد کنید'),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل 8 کاراکتر داشته باشد')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'رمز عبور باید شامل حروف بزرگ، کوچک و اعداد باشد'),
  phoneNumber: z.string().min(10, 'شماره تماس معتبر نیست'),
  jobName: z.string().min(2, 'عنوان شغلی باید حداقل 2 حرف داشته باشد'),
  company: z.string().min(2, 'نام شرکت باید حداقل 2 حرف داشته باشد'),
  bio: z.string().min(10, 'بیوگرافی باید حداقل 10 حرف داشته باشد'),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
      jobName: '',
      company: '',
      bio: '',
    },
  });

  const onSubmit = async (data: SetupFormValues) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
      }
      console.log('Submitting form data...');
      const result = await createSuperAdmin(formData);
      console.log('Result from createSuperAdmin:', result);

      if (result?.success) {
        console.log('Success! Showing toast...');
        toast({
          title: 'عملیات موفق',
          description: 'تنظیمات اولیه با موفقیت انجام شد. در حال انتقال به صفحه ورود...',
          variant: 'default',
          duration: 5000,
        });
        setTimeout(() => {
          console.log('Redirecting to signin...');
          router.push('/signin');
        }, 2000);
      } else {
        console.log('Error! Showing error toast...');
        toast({
          title: 'خطا در تنظیمات',
          description: result?.message || 'خطایی در تنظیمات اولیه سیستم رخ داد',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Caught error:', error);
      toast({
        title: 'خطای سیستمی',
        description: error instanceof Error ? error.message : 'خطایی در پردازش اطلاعات رخ داد',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 py-12">
      <div className="container">
        <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-800 shadow-xl rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">تنظیمات اولیه سیستم</h2>
            <p className="text-gray-600">
              لطفاً برای راه‌اندازی سیستم، اطلاعات مدیر اصلی را وارد کنید
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">نام</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="نام خود را وارد کنید"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">ایمیل</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="example@domain.com"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">رمز عبور</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="********"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">شماره تماس</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="09xxxxxxxxx"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">عنوان شغلی</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="مثال: مدیر فنی"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">نام شرکت</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="نام شرکت خود را وارد کنید"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">بیوگرافی</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                        placeholder="درباره خود بنویسید..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm mt-1" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium py-3 rounded-lg shadow-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <InlineLoadingSkeleton className="text-white" />
                    <span>در حال ایجاد حساب...</span>
                  </div>
                ) : (
                  'ایجاد حساب سوپر ادمین'
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
            </div>
            <p className="text-gray-600 text-center">در حال ایجاد حساب سوپر ادمین...</p>
          </div>
        </div>
      )}
    </div>
  );
}
