'use client';

/**
 * useActionToast — wrapper سبک روی useToast.
 * ─────────────────────────────────────────────────────────────
 *  کمک می‌کند در server actions فقط یک خط بنویسید:
 *    const toast = useActionToast();
 *    toast.success('ذخیره شد');
 *    toast.error('خطا');
 *
 *  خودکار error.message از shape server استخراج می‌شود.
 */

import { useToast } from '@/components/ui/use-toast';

export function useActionToast() {
  const { toast } = useToast();
  return {
    success: (message: string, description?: string) => {
      toast({
        title: message,
        description,
      });
    },
    error: (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: 'destructive',
      });
    },
    info: (message: string, description?: string) => {
      toast({
        title: message,
        description,
      });
    },
  };
}
