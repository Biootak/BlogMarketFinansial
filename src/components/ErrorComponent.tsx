'use client';
import type React from 'react';
import { IoAlertCircle } from 'react-icons/io5';
import { motion } from '@/lib/motion-shim';
import ButtonPrimary from '@/components/Button/ButtonPrimary';

interface ErrorComponentProps {
  message: string;
  onRetry?: () => void;
}

const ErrorComponent: React.FC<ErrorComponentProps> = ({ message, onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900 rounded-lg shadow-lg"
    >
      <IoAlertCircle className="w-16 h-16 text-red-500 dark:text-red-300 mb-4" />
      <h2 className="text-2xl font-bold text-red-700 dark:text-red-200 mb-2">
        اینجا چیکار میکنی ! حتما مشکلی پیش اومد دوباره امتحان کن .
      </h2>
      <p className="text-red-600 dark:text-red-100 text-center mb-6">{message}</p>
      {onRetry && (
        <ButtonPrimary onClick={onRetry} className="bg-red-600 hover:bg-red-700">
          تلاش مجدد
        </ButtonPrimary>
      )}
    </motion.div>
  );
};

export default ErrorComponent;
