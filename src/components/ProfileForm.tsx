'use client';

import { updateProfile } from '@/actions/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { UpdateProfileSchema } from '@/schemas';
import type { UpdateProfileInput, UserWithProfile } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  KeyRound,
  Lightbulb,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import Loading from './Button/Loading';
import ImageUploadDialog from './ImageUpload/ImageUploadDialog';

interface ProfileFormProps {
  initialData: UserWithProfile;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData }) => {
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isBgImageDialogOpen, setIsBgImageDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialData.profile?.avatar ?? '');
  const [bgImagePreview, setBgImagePreview] = useState(initialData.profile?.bgImage ?? '');
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2026-07-19: آیا شماره موبایل ثبت شده؟ (برای badge هشدار سرویس‌های مالی)
  const hasPhone = !!initialData.phoneNumber;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: initialData.name ?? '',
      email: initialData.email ?? '',
      phoneNumber: initialData.phoneNumber ?? '',
      bio: initialData.profile?.bio ?? '',
      jobName: initialData.profile?.jobName ?? '',
      bgImage: initialData.profile?.bgImage ?? '',
    },
  });

  const handleImageUpload = useCallback(
    (urls: string[], type: 'avatar' | 'bgImage') => {
      if (urls.length > 0) {
        if (type === 'avatar') {
          setAvatarPreview(urls[0]);
          setValue('imageUrl', urls[0]);
        } else {
          setBgImagePreview(urls[0]);
          setValue('bgImage', urls[0]);
        }
      }
    },
    [setValue],
  );

  const handleImageRemove = useCallback(
    (type: 'avatar' | 'bgImage') => {
      if (type === 'avatar') {
        setAvatarPreview('');
        setValue('imageUrl', '');
      } else {
        setBgImagePreview('');
        setValue('bgImage', '');
      }
    },
    [setValue],
  );

  const onSubmit = async (data: UpdateProfileInput) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name || '');
      formData.append('email', data.email || '');
      formData.append('phoneNumber', data.phoneNumber || '');
      formData.append('bio', data.bio || '');
      formData.append('jobName', data.jobName || '');
      formData.append('imageUrl', avatarPreview || '');
      formData.append('bgImage', bgImagePreview || '');
      if (data.currentPassword) formData.append('currentPassword', data.currentPassword);
      if (data.newPassword) formData.append('newPassword', data.newPassword);
      if (data.confirmNewPassword) formData.append('confirmNewPassword', data.confirmNewPassword);

      const result = await updateProfile(formData);
      toast({
        title: result.success ? 'موفقیت' : 'خطا',
        description: result.success ? 'پروفایل با موفقیت بروزرسانی شد' : result.message,
        variant: result.success ? 'success' : 'destructive',
      });
    } catch {
      toast({ title: 'خطا', description: 'خطا در بروزرسانی پروفایل', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rtl">
      {/* Profile Images */}
      <div className="relative @container/profile-cover">
        <div className="relative w-full h-40 sm:h-48 @md/profile-cover:h-56 rounded-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
          {bgImagePreview && (
            <Image
              src={bgImagePreview}
              alt="Background"
              fill
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
          <button
            type="button"
            onClick={() => setIsBgImageDialogOpen(true)}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-800/90 rounded-xl shadow-lg backdrop-blur-sm">
              <ImageIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                تغییر کاور
              </span>
            </div>
          </button>
          {!bgImagePreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-slate-400 dark:text-slate-500 text-sm">تصویر پس‌زمینه</span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-10 sm:-bottom-12 end-4 sm:end-6">
          <div className="relative group">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAvatarDialogOpen(true)}
              className="absolute -bottom-2 -left-2 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-200"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-8" />

      {/* بنر هشدار — اگر موبایل ثبت نشده */}
      {!hasPhone && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200/70 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-900/20">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              شماره موبایل تأیید نشده
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              برای استفاده از خدمات مالی (حواله، خرید ارز، رمزارز) باید شماره موبایل خود را در پایین
              وارد کنید.
            </p>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="group">
          <Label
            htmlFor="name"
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            <User className="w-4 h-4 text-slate-400" />
            نام
          </Label>
          <Input
            id="name"
            {...register('name')}
            className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-right"
            placeholder="نام خود را وارد کنید"
          />
          {errors.name && <p className="text-red-500 text-xs mt-2">{errors.name.message}</p>}
        </div>
        <div className="group">
          <Label
            htmlFor="email"
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            <Mail className="w-4 h-4 text-slate-400" />
            ایمیل
          </Label>
          <Input
            id="email"
            {...register('email')}
            type="email"
            dir="ltr"
            className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-left"
            placeholder="email@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-2">{errors.email.message}</p>}
        </div>
        {/* شماره موبایل */}
        <div className="group">
          <Label
            htmlFor="phoneNumber"
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            <Phone className="w-4 h-4 text-slate-400" />
            شماره موبایل
            <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
              (لازم برای خدمات مالی)
            </span>
          </Label>
          <Input
            id="phoneNumber"
            {...register('phoneNumber')}
            type="tel"
            dir="ltr"
            className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-left"
            placeholder="07X-XXXXXXX یا +93XXXXXXXXX"
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-xs mt-2">{errors.phoneNumber.message}</p>
          )}
        </div>
        <div className="group">
          <Label
            htmlFor="jobName"
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            <Briefcase className="w-4 h-4 text-slate-400" />
            شغل
          </Label>
          <Input
            id="jobName"
            {...register('jobName')}
            className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-right"
            placeholder="شغل خود را وارد کنید"
          />
          {errors.jobName && <p className="text-red-500 text-xs mt-2">{errors.jobName.message}</p>}
        </div>
        <div className="group">
          <Label
            htmlFor="bio"
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            بیوگرافی
          </Label>
          <Textarea
            id="bio"
            {...register('bio')}
            rows={4}
            className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-right resize-none"
            placeholder="درباره خودتان بنویسید..."
          />
          {errors.bio && <p className="text-red-500 text-xs mt-2">{errors.bio.message}</p>}
        </div>
      </div>

      {/* Password Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900/50 shadow-sm">
        <button
          type="button"
          onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
          className={cn(
            'w-full flex items-center justify-between p-5 transition-all duration-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50',
            isPasswordSectionOpen && 'border-b border-slate-200/60 dark:border-slate-700/60',
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-3 rounded-xl transition-all duration-300',
                isPasswordSectionOpen
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25'
                  : 'bg-slate-200/80 dark:bg-slate-700/80',
              )}
            >
              <Shield
                className={cn(
                  'w-5 h-5 transition-colors duration-300',
                  isPasswordSectionOpen ? 'text-white' : 'text-slate-500 dark:text-slate-400',
                )}
              />
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">امنیت حساب</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">تغییر رمز عبور</p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-slate-400 transition-transform duration-300',
              isPasswordSectionOpen && 'rotate-180',
            )}
          />
        </button>
        <div
          className={cn(
            'grid transition-all duration-300 ease-out',
            isPasswordSectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="p-5 space-y-5">
              <div className="group">
                <Label
                  htmlFor="currentPassword"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  رمز عبور فعلی
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    {...register('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="w-full h-12 px-4 pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-right"
                    placeholder="رمز عبور فعلی"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-xs mt-2">{errors.currentPassword.message}</p>
                )}
              </div>
              <div className="group">
                <Label
                  htmlFor="newPassword"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  <Lock className="w-4 h-4 text-amber-500" />
                  رمز عبور جدید
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    {...register('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    className="w-full h-12 px-4 pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-right"
                    placeholder="رمز عبور جدید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-xs mt-2">{errors.newPassword.message}</p>
                )}
              </div>
              <div className="group">
                <Label
                  htmlFor="confirmNewPassword"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  <Check className="w-4 h-4 text-amber-500" />
                  تکرار رمز عبور جدید
                </Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    {...register('confirmNewPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full h-12 px-4 pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-right"
                    placeholder="تکرار رمز عبور جدید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {errors.confirmNewPassword && (
                  <p className="text-red-500 text-xs mt-2">{errors.confirmNewPassword.message}</p>
                )}
              </div>
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 flex items-start gap-2">
                <Lightbulb
                  className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  رمز عبور قوی شامل حداقل ۶ کاراکتر، ترکیبی از حروف بزرگ و کوچک، اعداد و نمادها است.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3">
            <Loading size="sm" variant="secondary" type="spinner" />
            <span>در حال بروزرسانی...</span>
          </div>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            بروزرسانی پروفایل
          </span>
        )}
      </Button>

      <ImageUploadDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setIsAvatarDialogOpen(false)}
        onImageUpload={(urls) => handleImageUpload(urls, 'avatar')}
        onImageRemove={() => handleImageRemove('avatar')}
        initialPreview={avatarPreview}
        title="تغییر آواتار"
        folder="avatars"
      />
      <ImageUploadDialog
        isOpen={isBgImageDialogOpen}
        onClose={() => setIsBgImageDialogOpen(false)}
        onImageUpload={(urls) => handleImageUpload(urls, 'bgImage')}
        onImageRemove={() => handleImageRemove('bgImage')}
        initialPreview={bgImagePreview}
        title="تغییر تصویر پس‌زمینه"
        folder="avatars"
      />
    </form>
  );
};

export default ProfileForm;
