'use client';

import { type FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

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
    reset,
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
        reset();
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در ثبت اشتراک',
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
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="relative flex items-center">
        {/* Input Container */}
        <div className="relative flex-1">
          <div className="absolute start-3 sm:start-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
          </div>
          <Input
            {...register('email')}
            placeholder="ایمیل خود را وارد کنید"
            type="email"
            className="w-full ps-10 sm:ps-12 pe-24 sm:pe-32 py-3 sm:py-4 h-11 sm:h-14 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl sm:rounded-2xl text-white text-sm sm:text-base placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/15 transition-all duration-200"
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="absolute end-1.5 sm:end-2 top-1/2 -translate-y-1/2 h-8 sm:h-10 px-3 sm:px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-neutral-900 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-lg shadow-amber-500/30 transition-all duration-200 hover:shadow-amber-500/50 hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline">عضویت</span>
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {errors.email && (
        <motion.p 
          className="mt-2 text-amber-300 text-xs sm:text-sm flex items-center gap-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="w-1 h-1 rounded-full bg-amber-300" />
          {errors.email.message}
        </motion.p>
      )}
    </motion.form>
  );
};

export default SubscribeForm;
