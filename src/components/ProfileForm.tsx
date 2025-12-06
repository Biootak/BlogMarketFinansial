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
import { Briefcase, Camera, Check, ChevronDown, Eye, EyeOff, FileText, ImageIcon, KeyRound, Lock, Mail, Shield, User } from 'lucide-react';;;
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
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'خطا', description: 'خطا در بروزرسانی پروفایل', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8 rtl">
      {/* Profile Images */}
      <div className="relative">
        <div className="relative w-full h-32 sm:h-40 md:h-44 rounded-xl sm:rounded-2xl overflow-hidden group">
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
          <button
            type="button"
            onClick={() => setIsBgImageDialogOpen(true)}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
            aria-label="تغییر تصویر پس‌زمینه"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/90 dark:bg-slate-800/90 rounded-lg sm:rounded-xl shadow-lg backdrop-blur-sm">
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                تغییر کاور
              </span>
            </div>
          </button>
          {!bgImagePreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                تصویر پس‌زمینه
              </span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-10 sm:-bottom-12 right-3 sm:right-4 md:right-6">
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl sm:rounded-2xl overflow-hidden border-3 sm:border-4 border-white dark:border-slate-900 shadow-xl gradient-neutral-br dark:from-slate-700 dark:to-slate-800">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  fill
                  sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-slate-400 dark:text-slate-500" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAvatarDialogOpen(true)}
              className="absolute -bottom-1.5 sm:-bottom-2 -left-1.5 sm:-left-2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-200"
              aria-label="تغییر تصویر پروفایل"
            >
              <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-6 sm:h-8" />

      {/* Form Fields */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        <div className="group">
          <Label
            htmlFor="name"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            نام
          </Label>
          <Input
            id="name"
            {...register('name')}
            className="w-full h-10 sm:h-11 md:h-12 px-3 sm:px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-right text-sm sm:text-base"
            placeholder="نام خود را وارد کنید"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="group">
          <Label
            htmlFor="email"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
          >
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            ایمیل
          </Label>
          <Input
            id="email"
            {...register('email')}
            type="email"
            dir="ltr"
            className="w-full h-10 sm:h-11 md:h-12 px-3 sm:px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-left text-sm sm:text-base"
            placeholder="email@example.com"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="group">
          <Label
            htmlFor="jobName"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
          >
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            شغل
          </Label>
          <Input
            id="jobName"
            {...register('jobName')}
            className="w-full h-10 sm:h-11 md:h-12 px-3 sm:px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-right text-sm sm:text-base"
            placeholder="شغل خود را وارد کنید"
            aria-invalid={errors.jobName ? 'true' : 'false'}
            aria-describedby={errors.jobName ? 'jobName-error' : undefined}
          />
          {errors.jobName && (
            <p id="jobName-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
              {errors.jobName.message}
            </p>
          )}
        </div>
        <div className="group">
          <Label
            htmlFor="bio"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            بیوگرافی
          </Label>
          <Textarea
            id="bio"
            {...register('bio')}
            rows={4}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-right resize-none text-sm sm:text-base"
            placeholder="درباره خودتان بنویسید..."
            aria-invalid={errors.bio ? 'true' : 'false'}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
          />
          {errors.bio && (
            <p id="bio-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
              {errors.bio.message}
            </p>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900/50 shadow-sm">
        <button
          type="button"
          onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
          className={cn(
            'w-full flex items-center justify-between p-3.5 sm:p-4 md:p-5 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50',
            isPasswordSectionOpen && 'border-b border-slate-200/60 dark:border-slate-700/60',
          )}
          aria-expanded={isPasswordSectionOpen}
          aria-controls="password-section"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
            <div
              className={cn(
                'p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl transition-all duration-200',
                isPasswordSectionOpen
                  ? 'gradient-warning-br shadow-lg shadow-amber-500/25'
                  : 'bg-slate-200/80 dark:bg-slate-700/80',
              )}
            >
              <Shield
                className={cn(
                  'w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 transition-colors duration-200',
                  isPasswordSectionOpen ? 'text-white' : 'text-slate-500 dark:text-slate-400',
                )}
              />
            </div>
            <div className="text-right">
              <h3 id="password-section-heading" className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">
                امنیت حساب
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                تغییر رمز عبور
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform duration-200',
              isPasswordSectionOpen && 'rotate-180',
            )}
          />
        </button>
        <div
          id="password-section"
          className={cn(
            'grid transition-all duration-200 ease-out',
            isPasswordSectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
          role="region"
          aria-labelledby="password-section-heading"
        >
          <div className="overflow-hidden">
            <div className="p-3.5 sm:p-4 md:p-5 space-y-4 sm:space-y-5">
              <div className="group">
                <Label
                  htmlFor="currentPassword"
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
                >
                  <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  رمز عبور فعلی
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    {...register('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="w-full h-10 sm:h-11 md:h-12 px-3 sm:px-4 pl-10 sm:pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-right text-sm sm:text-base"
                    placeholder="رمز عبور فعلی"
                    aria-invalid={errors.currentPassword ? 'true' : 'false'}
                    aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label={showCurrentPassword ? 'مخفی کردن رمز عبور فعلی' : 'نمایش رمز عبور فعلی'}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p id="currentPassword-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="group">
                <Label
                  htmlFor="newPassword"
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
                >
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  رمز عبور جدید
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    {...register('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    className="w-full h-10 sm:h-11 md:h-12 px-3 sm:px-4 pl-10 sm:pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-right text-sm sm:text-base"
                    placeholder="رمز عبور جدید"
                    aria-invalid={errors.newPassword ? 'true' : 'false'}
                    aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label={showNewPassword ? 'مخفی کردن رمز عبور جدید' : 'نمایش رمز عبور جدید'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p id="newPassword-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="group">
                <Label
                  htmlFor="confirmNewPassword"
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2"
                >
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  تکرار رمز عبور جدید
                </Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    {...register('confirmNewPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full h-10 sm:h-11 md:h-12 px-3 sm:px-4 pl-10 sm:pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-right text-sm sm:text-base"
                    placeholder="تکرار رمز عبور جدید"
                    aria-invalid={errors.confirmNewPassword ? 'true' : 'false'}
                    aria-describedby={errors.confirmNewPassword ? 'confirmNewPassword-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label={showConfirmPassword ? 'مخفی کردن تکرار رمز عبور' : 'نمایش تکرار رمز عبور'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                {errors.confirmNewPassword && (
                  <p id="confirmNewPassword-error" className="text-red-500 text-xs mt-1.5 sm:mt-2" role="alert">
                    {errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
              <div className="p-3 sm:p-3.5 md:p-4 rounded-lg sm:rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  💡 رمز عبور قوی شامل حداقل ۶ کاراکتر، ترکیبی از حروف بزرگ و کوچک، اعداد و نمادها
                  است.
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
        className="w-full h-11 sm:h-12 md:h-14 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 text-white font-medium rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 text-sm sm:text-base"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Loading size="sm" variant="secondary" type="spinner" />
            <span>در حال بروزرسانی...</span>
          </div>
        ) : (
          <span className="flex items-center justify-center gap-1.5 sm:gap-2">
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
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
