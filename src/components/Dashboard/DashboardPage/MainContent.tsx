'use client';

import { useSidebarStore } from '@/hooks/sidebarStore';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const { isOpen, isMobile } = useSidebarStore();
  const pathname = usePathname();

  const pageVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -12 },
  };

  const pageTransition: Transition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.25,
  };

  // Calculate margin based on sidebar state
  const marginRight = isMobile ? 0 : isOpen ? 260 : 76;

  return (
    <main
      className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 transition-[margin] duration-300 ease-out"
      style={{ marginRight }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="relative min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default MainContent;
