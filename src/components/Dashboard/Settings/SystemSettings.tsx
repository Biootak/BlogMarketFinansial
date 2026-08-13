'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Mail, Save, Settings, Share2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const settingsSchema = z.object({
  siteName: z.string().min(2, 'نام سایت باید حداقل 2 حرف باشد'),
  siteUrl: z.string().url('آدرس سایت باید یک آدرس معتبر باشد'),
  siteDescription: z.string(),
  maintenanceMode: z.boolean(),
  enableCache: z.boolean(),
  smtpHost: z.string().min(1, 'SMTP هاست نمی‌تواند خالی باشد'),
  smtpPort: z.string().regex(/^\d+$/, 'پورت باید عدد باشد'),
  smtpUser: z.string(),
  smtpPass: z.string(),
  defaultFromEmail: z.string().email('آدرس ایمیل فرستنده باید یک آدرس ایمیل معتبر باشد'),
  instagram: z.string().url('آدرس اینستاگرام باید یک آدرس معتبر باشد'),
  telegram: z.string().url('آدرس تلگرام باید یک آدرس معتبر باشد'),
  twitter: z.string().url('آدرس توییتر باید یک آدرس معتبر باشد'),
  linkedin: z.string().url('آدرس لینکدین باید یک آدرس معتبر باشد'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    mode: 'onTouched',
    defaultValues: {
      siteName: '',
      siteUrl: '',
      siteDescription: '',
      maintenanceMode: false,
      enableCache: true,
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPass: '',
      defaultFromEmail: '',
      instagram: '',
      telegram: '',
      twitter: '',
      linkedin: '',
    },
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success) {
          form.reset(data.settings);
        } else {
          setError(data.message || 'Failed to load settings');
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'An error occurred while loading settings',
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [form, toast]);

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'موفقیت',
          description: 'تنظیمات با موفقیت ذخیره شد',
          variant: 'success',
        });
      } else {
        throw new Error(data.message || 'خطا در ذخیره تنظیمات');
      }
    } catch (_error) {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره تنظیمات',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full space-y-6 rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">تنظیمات سیستم</h2>
        <Button
          type="submit"
          onClick={form.handleSubmit(onSubmit)}
          disabled={form.formState.isSubmitting}
          className="gap-2"
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          ذخیره تنظیمات
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 lg:max-w-[600px] rtl">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                تنظیمات عمومی
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                تنظیمات ایمیل
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                شبکه‌های اجتماعی
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card className="dash-panel">
                <CardHeader>
                  <CardTitle>تنظیمات عمومی سایت</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نام سایت</FormLabel>
                          <FormControl>
                            <Input placeholder="نام سایت را وارد کنید" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>آدرس سایت</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="siteDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>توضیحات سایت</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="توضیحات سایت را وارد کنید"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maintenanceMode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">حالت تعمیر و نگهداری</FormLabel>
                            <FormDescription>فعال کردن حالت تعمیر و نگهداری سایت</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enableCache"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">فعال‌سازی کش</FormLabel>
                            <FormDescription>فعال کردن کش برای بهبود عملکرد</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-6">
              <Card className="dash-panel">
                <CardHeader>
                  <CardTitle>تنظیمات ایمیل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="siteEmail" className="text-right">
                        ایمیل سایت
                      </label>
                      <Input
                        id="siteEmail"
                        type="email"
                        placeholder="ایمیل سایت را وارد کنید"
                        className="text-right"
                        {...form.register('defaultFromEmail')}
                      />
                      {form.formState.errors.defaultFromEmail && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.defaultFromEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="smtpHost" className="text-right">
                        SMTP هاست
                      </label>
                      <Input
                        id="smtpHost"
                        placeholder="هاست SMTP را وارد کنید"
                        className="text-right"
                        {...form.register('smtpHost')}
                      />
                      {form.formState.errors.smtpHost && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.smtpHost.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="smtpPort" className="text-right">
                        SMTP پورت
                      </label>
                      <Input
                        id="smtpPort"
                        placeholder="پورت SMTP را وارد کنید"
                        className="text-right"
                        {...form.register('smtpPort')}
                      />
                      {form.formState.errors.smtpPort && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.smtpPort.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="smtpUser" className="text-right">
                        SMTP نام کاربری
                      </label>
                      <Input
                        id="smtpUser"
                        placeholder="نام کاربری SMTP را وارد کنید"
                        className="text-right"
                        {...form.register('smtpUser')}
                      />
                      {form.formState.errors.smtpUser && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.smtpUser.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="smtpPass" className="text-right">
                        SMTP رمز عبور
                      </label>
                      <Input
                        id="smtpPass"
                        type="password"
                        placeholder="رمز عبور SMTP را وارد کنید"
                        className="text-right"
                        {...form.register('smtpPass')}
                      />
                      {form.formState.errors.smtpPass && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.smtpPass.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <Card className="dash-panel">
                <CardHeader>
                  <CardTitle>شبکه‌های اجتماعی</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="instagram" className="text-right">
                        اینستاگرام
                      </label>
                      <Input
                        id="instagram"
                        placeholder="آدرس اینستاگرام را وارد کنید"
                        className="text-right"
                        {...form.register('instagram')}
                      />
                      {form.formState.errors.instagram && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.instagram.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="telegram" className="text-right">
                        تلگرام
                      </label>
                      <Input
                        id="telegram"
                        placeholder="آدرس تلگرام را وارد کنید"
                        className="text-right"
                        {...form.register('telegram')}
                      />
                      {form.formState.errors.telegram && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.telegram.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="twitter" className="text-right">
                        توییتر
                      </label>
                      <Input
                        id="twitter"
                        placeholder="آدرس توییتر را وارد کنید"
                        className="text-right"
                        {...form.register('twitter')}
                      />
                      {form.formState.errors.twitter && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.twitter.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="linkedin" className="text-right">
                        لینکدین
                      </label>
                      <Input
                        id="linkedin"
                        placeholder="آدرس لینکدین را وارد کنید"
                        className="text-right"
                        {...form.register('linkedin')}
                      />
                      {form.formState.errors.linkedin && (
                        <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.linkedin.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full sm:w-auto"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              ذخیره تنظیمات
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
