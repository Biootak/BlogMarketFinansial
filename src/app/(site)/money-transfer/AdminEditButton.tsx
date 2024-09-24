'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/components/ui/use-toast';
import { updateExchangeRates } from '@/actions/exchange-rates';

type ExchangeRateFormData = {
  [key: string]: {
    buy: string;
    sell: string;
  };
};

const initialFormData: ExchangeRateFormData = {
  perfectMoney: { buy: '', sell: '' },
  transferWise: { buy: '', sell: '' },
  payPal: { buy: '', sell: '' },
  bankAccount: { buy: '', sell: '' },
  revolut: { buy: '', sell: '' },
  payoneer: { buy: '', sell: '' },
};

export default function AdminEditButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ExchangeRateFormData>(initialFormData);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await updateExchangeRates(formData);
      setIsOpen(false);
      toast({
        title: 'موفقیت',
        description: 'قیمت‌های حواله با موفقیت به‌روزرسانی شدند.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      toast({
        title: 'خطا',
        description: 'به‌روزرسانی قیمت‌ها با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (service: string, type: 'buy' | 'sell', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [service]: { ...prev[service], [type]: value },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            className="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            ویرایش قیمت‌ها
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
            ویرایش قیمت‌های حواله
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.entries(formData).map(([service, rates]) => (
            <div key={service} className="space-y-2">
              <Label
                htmlFor={`${service}-buy`}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {service} (خرید)
              </Label>
              <Input
                id={`${service}-buy`}
                value={rates.buy}
                onChange={(e) => handleInputChange(service, 'buy', e.target.value)}
                type="number"
                placeholder="نرخ خرید"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <Label
                htmlFor={`${service}-sell`}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {service} (فروش)
              </Label>
              <Input
                id={`${service}-sell`}
                value={rates.sell}
                onChange={(e) => handleInputChange(service, 'sell', e.target.value)}
                type="number"
                placeholder="نرخ فروش"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          ))}
          <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white">
            ذخیره تغییرات
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
