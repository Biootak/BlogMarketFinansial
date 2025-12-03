'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfile } from '@/actions/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import type { UpdateProfileInput, UserWithProfile } from '@/types/types';
import { UpdateProfileSchema } from '@/schemas';
import Image from 'next/image';
import ImageUploadDialog from './ImageUpload/ImageUploadDialog';
import Loading from './Button/Loading';
import { Camera, User, Mail, Briefcase, FileText, Lock, KeyRound, Check, ImageIcon } from 'lucide-react';

interface ProfileFormProps {
  initialData: UserWithProfile;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData }) => {
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isBgImageDialogOpen, setIsBgImageDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialData.profile?.avatar ?? '');
  const [bgImagePreview, setBgImagePreview] = useState(initialData.profile?.bgImage ?? '');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value as string);
        }
      });
      if (avatarPreview !== initialData.profile?.avatar) {
        formData.append('imageUrl', avatarPreview);
      }
      if (bgImagePreview !== initialData.profile?.bgImage) {
        formData.append('bgImage', bgImagePreview);
      }

      const result = await updateProfile(formData);
      toast({
        title: result.success ? 'موفقیت' : 'خطا',
        description: result.success ? 'پروفایل با موفقیت بروزرسانی شد' : 'خطا در بروزرسانی پروفایل',
        variant: result.success ? 'success' : 'destructive',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بروزرسانی پروفایل',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rtl">
      {/* Profile Images Section */}
      <div className="relative">
        {/* Background Image */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden group">
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">تغییر کاور</span>
            </div>
          </button>
          {!bgImagePreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-slate-400 dark:text-slate-500 text-sm">تصویر پس‌زمینه</span>
            </div>
          )}
        </div>

        {/* Avatar - Overlapping */}
        <div className="absolute -bottom-12 right-6">
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
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

      {/* Spacer for avatar overlap */}
      <div className="h-8" />

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Name Field */}
        <div className="group">
          <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <User className="w-4 h-4 text-slate-400" />
            نام
          </Label>
          <div className="relative">
            <Input
              id="name"
              {...register('name')}
              className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
              placeholder="نام خود را وارد کنید"
            />
          </div>
          {errors.name && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="group">
          <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Mail className="w-4 h-4 text-slate-400" />
            ایمیل
          </Label>
          <Input
            id="email"
            {...register('email')}
            type="email"
            dir="ltr"
            className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-left focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
            placeholder="email@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Job Field */}
        <div className="group">
          <Label htmlFor="jobName" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            شغل
          </Label>
          <Input
            id="jobName"
            {...register('jobName')}
            className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
            placeholder="شغل خود را وارد کنید"
          />
          {errors.jobName && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.jobName.message}
            </p>
          )}
        </div>

        {/* Bio Field */}
        <div className="group">
          <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            بیوگرافی
          </Label>
          <Textarea
            id="bio"
            {...register('bio')}
            rows={4}
            className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-right resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
            placeholder="درباره خودتان بنویسید..."
          />
          {errors.bio && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {errors.bio.message}
            </p>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <Checkbox
            id="changePassword"
            checked={isChangingPassword}
            onCheckedChange={(checked) => setIsChangingPassword(checked as boolean)}
            className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-600 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
          />
          <Label
            htmlFor="changePassword"
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            تغییر رمز عبور
          </Label>
        </div>

        {isChangingPassword && (
          <div className="space-y-5 p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <div>
              <Label htmlFor="currentPassword" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <KeyRound className="w-4 h-4 text-slate-400" />
                رمز عبور فعلی
              </Label>
              <Input
                id="currentPassword"
                {...register('currentPassword')}
                type="password"
                className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-2">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newPassword" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Lock className="w-4 h-4 text-slate-400" />
                رمز عبور جدید
              </Label>
              <Input
                id="newPassword"
                {...register('newPassword')}
                type="password"
                className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-2">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmNewPassword" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Check className="w-4 h-4 text-slate-400" />
                تکرار رمز عبور جدید
              </Label>
              <Input
                id="confirmNewPassword"
                {...register('confirmNewPassword')}
                type="password"
                className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
              {errors.confirmNewPassword && (
                <p className="text-red-500 text-xs mt-2">{errors.confirmNewPassword.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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

      {/* Image Upload Dialogs */}
      <ImageUploadDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setIsAvatarDialogOpen(false)}
        onImageUpload={(urls) => handleImageUpload(urls, 'avatar')}
        onImageRemove={() => handleImageRemove('avatar')}
        initialPreview={avatarPreview}
        title="تغییر آواتار"
      />

      <ImageUploadDialog
        isOpen={isBgImageDialogOpen}
        onClose={() => setIsBgImageDialogOpen(false)}
        onImageUpload={(urls) => handleImageUpload(urls, 'bgImage')}
        onImageRemove={() => handleImageRemove('bgImage')}
        initialPreview={bgImagePreview}
        title="تغییر تصویر پس‌زمینه"
      />
    </form>
  );
};

export default ProfileForm;
