'use client';


import { useSidebarStore } from '@/hooks/sidebarStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const { isOpen, isMobile } = useSidebarStore();

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
    <main
      className={'flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-all duration-300'}
      style={{
        marginRight: isMobile ? 0 : isOpen ? '240px' : '60px',
      }}
    >
      <AnimatePresence mode="wait">
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
      </AnimatePresence>
    </main>
  );
};

export default MainContent;
