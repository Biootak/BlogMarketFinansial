'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
  };

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* اینجا می‌توانید یک کامپوننت Loader اضافه کنید */}
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default MainContent;