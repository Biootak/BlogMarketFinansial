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
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'خطا',
        description: 'مشکلی در بروزرسانی پروفایل رخ داد. لطفا دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto rtl">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar"
              layout="fill"
              objectFit="cover"
              className="rounded-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">بدون آواتار</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => setIsAvatarDialogOpen(true)}
          className="dark:bg-gray-700 dark:text-white"
        >
          تغییر آواتار
        </Button>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-full h-48 rounded-lg overflow-hidden border-4 border-gray-200 dark:border-gray-700">
          {bgImagePreview ? (
            <Image
              src={bgImagePreview}
              alt="Background Image"
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">بدون تصویر پس‌زمینه</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => setIsBgImageDialogOpen(true)}
          className="dark:bg-gray-700 dark:text-white"
        >
          تغییر تصویر پس‌زمینه
        </Button>
      </div>

      <div>
        <Label htmlFor="name">نام</Label>
        <Input
          id="name"
          {...register('name')}
          className="dark:bg-gray-800 dark:text-white text-right"
        />
        {errors.name && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">ایمیل</Label>
        <Input
          id="email"
          {...register('email')}
          type="email"
          className="dark:bg-gray-800 dark:text-white text-right"
          dir="ltr"
        />
        {errors.email && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="jobName">شغل</Label>
        <Input
          id="jobName"
          {...register('jobName')}
          className="dark:bg-gray-800 dark:text-white text-right"
          placeholder="شغل خود را وارد کنید"
        />
        {errors.jobName && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
            {errors.jobName.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="bio">بیوگرافی</Label>
        <Textarea
          id="bio"
          {...register('bio')}
          className="dark:bg-gray-800 dark:text-white text-right"
        />
        {errors.bio && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
            {errors.bio.message}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox
          id="changePassword"
          checked={isChangingPassword}
          onCheckedChange={(checked) => setIsChangingPassword(checked as boolean)}
        />
        <Label
          htmlFor="changePassword"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          تغییر رمز عبور
        </Label>
      </div>

      {isChangingPassword && (
        <>
          <div>
            <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
            <Input
              id="currentPassword"
              {...register('currentPassword')}
              type="password"
              className="dark:bg-gray-800 dark:text-white text-right"
            />
            {errors.currentPassword && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="newPassword">رمز عبور جدید</Label>
            <Input
              id="newPassword"
              {...register('newPassword')}
              type="password"
              className="dark:bg-gray-800 dark:text-white text-right"
            />
            {errors.newPassword && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmNewPassword">تکرار رمز عبور جدید</Label>
            <Input
              id="confirmNewPassword"
              {...register('confirmNewPassword')}
              type="password"
              className="dark:bg-gray-800 dark:text-white text-right"
            />
            {errors.confirmNewPassword && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
                {errors.confirmNewPassword.message}
              </p>
            )}
          </div>
        </>
      )}

      <Button
        type="submit"
        className="w-full dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
        disabled={isSubmitting}
      >
        <div className="flex items-center justify-center w-full">
          {isSubmitting ? (
            <>
              <span className="ml-2">در حال بروزرسانی ...</span>
              <Loading size="sm" variant="secondary" type="spinner" />
            </>
          ) : (
            'بروزرسانی پروفایل'
          )}
        </div>
      </Button>

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
