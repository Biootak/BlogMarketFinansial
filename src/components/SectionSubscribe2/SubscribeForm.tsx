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
  onSubmit: (email: string) => Promise<{ success: boolean; message: string }>;
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
      const result = await onSubmit(data.email);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'اشتراک شما با موفقیت ثبت شد',
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: 'خطا در ثبت اشتراک',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'لطفا ایمیل معتبر وارد کنید',
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
        className="pr-4 pl-12 py-3 rounded-full border-2 border-primary-300 focus:border-primary-500 transition-all duration-300 w-full"
        disabled={isLoading}
      />
      {errors.email && (
        <p className="text-red-500 text-sm mt-1 absolute -bottom-6 right-0">
          {errors.email.message}
        </p>
      )}
      <motion.div
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          type="submit"
          size="icon"
          className="w-11 h-11 bg-gradient-to-r from-primary-400 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white rounded-full transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-white/20 hover:ring-white/40"
          disabled={isLoading}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5"
            >
              <HiArrowRight className="w-5 h-5 rotate-180" />
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ x: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <HiArrowRight className="w-5 h-5 rotate-180" />
            </motion.div>
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
};

export default SubscribeForm;
