'use client';

import { type FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { HiArrowRight } from 'react-icons/hi2';
import { motion } from 'framer-motion';

const schema = z.object({
  email: z.string().email({ message: 'ایمیل معتبر وارد کنید' }),
});

type FormData = z.infer<typeof schema>;

interface SubscribeFormProps {
  onSubmit: (email: string) => Promise<void>;
}

const SubscribeForm: FC<SubscribeFormProps> = ({ onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleFormSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data.email);
      toast({
        title: 'موفقیت',
        description: 'شما با موفقیت در خبرنامه عضو شدید!',
        variant: 'default',
        className: 'bg-green-500 text-white',
      });
    } catch {
      toast({
        title: 'خطا',
        description: 'مشکلی در عضویت پیش آمد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="mt-6 sm:mt-8 relative max-w-sm w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Input
        {...register('email')}
        placeholder="ایمیل خود را وارد کنید"
        type="email"
        className="pr-4 pl-12 py-3 rounded-full border-2 border-purple-300 focus:border-purple-500 transition-all duration-300 w-full"
        disabled={isLoading}
      />
      {errors.email && (
        <p className="text-red-500 text-sm mt-1 absolute -bottom-6 right-0">{errors.email.message}</p>
      )}
      <Button
        type="submit"
        size="icon"
        className="absolute left-1 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full transition-all duration-300"
        disabled={isLoading}
      >
        <HiArrowRight className="w-5 h-5 rotate-180" />
      </Button>
    </motion.form>
  );
};

export default SubscribeForm;