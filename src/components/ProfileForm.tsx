'use client';

import { useState } from 'react';
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
import ImageUploader from '@/components/ImageUpload/ImageUploader';
import Image from 'next/image';

interface ProfileFormProps {
  initialData: UserWithProfile;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData }) => {
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialData.profile?.avatar ?? '');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
    },
  });

  const handleImageUpload = (urls: string[]) => {
    if (urls.length > 0) {
      setAvatarPreview(urls[0]);
      setValue('imageUrl', urls[0]);
    }
  };

  const handleImageRemove = () => {
    setAvatarPreview('');
    setValue('imageUrl', '');
  };

  const onSubmit = async (data: UpdateProfileInput) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value as string);
      }
    });
    if (avatarPreview !== initialData.profile?.avatar) {
      formData.append('imageUrl', avatarPreview);
    }

    const result = await updateProfile(formData);
    toast({
      title: result.success ? 'موفقیت' : 'خطا',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
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
        {!isChangingAvatar ? (
          <Button
            type="button"
            onClick={() => setIsChangingAvatar(true)}
            className="dark:bg-gray-700 dark:text-white"
          >
            تغییر آواتار
          </Button>
        ) : (
          <ImageUploader
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            initialPreviews={avatarPreview ? [avatarPreview] : []}
          />
        )}
      </div>
      <div>
        <Input
          {...register('name')}
          placeholder="نام"
          className="dark:bg-gray-800 dark:text-white text-right"
        />
        {errors.name && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
            {errors.name.message}
          </p>
        )}
      </div>
      <div>
        <Input
          {...register('email')}
          placeholder="ایمیل"
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
        <Textarea
          {...register('bio')}
          placeholder="بیوگرافی"
          className="dark:bg-gray-800 dark:text-white text-right"
        />
        {errors.bio && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
            {errors.bio.message}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2 space-x-reverse">
        <Label
          htmlFor="changePassword"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          تغییر رمز عبور
        </Label>
        <Checkbox
          id="changePassword"
          checked={isChangingPassword}
          onCheckedChange={(checked) => setIsChangingPassword(checked as boolean)}
        />
      </div>
      {isChangingPassword && (
        <>
          <div>
            <Input
              {...register('currentPassword')}
              type="password"
              placeholder="رمز عبور فعلی"
              className="dark:bg-gray-800 dark:text-white text-right"
            />
            {errors.currentPassword && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div>
            <Input
              {...register('newPassword')}
              type="password"
              placeholder="رمز عبور جدید"
              className="dark:bg-gray-800 dark:text-white text-right"
            />
            {errors.newPassword && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 text-right">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div>
            <Input
              {...register('confirmNewPassword')}
              type="password"
              placeholder="تکرار رمز عبور جدید"
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
      >
        بروزرسانی پروفایل
      </Button>
    </form>
  );
};

export default ProfileForm;
