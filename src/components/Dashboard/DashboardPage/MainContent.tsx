'use client';

import { useSidebarStore } from '@/hooks/sidebarStore';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, type Variants, type Transition } from '@/lib/motion-shim';
import { AmbientBackground } from '@/components/Dashboard/primitives';

interface MainContentProps {
  children: React.ReactNode;
  /** When true, render the AmbientBackground drift behind the page content. */
  ambient?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ children, ambient = false }) => {
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

  // Calculate margin based on sidebar state.
  // On mobile the sidebar is an overlay, so we never need to reserve its width
  // on the main content. On desktop the margin tracks the open/closed width.
  const marginRight = isMobile ? 0 : isOpen ? 260 : 76;

  return (
    <main
      className="dash-scope dash-grid-texture flex-1 overflow-auto transition-[margin] duration-300 ease-out"
      style={{ marginRight }}
    >
        {/* Ambient drift backdrop — only on the home route, sits behind everything */}
        {ambient ? <AmbientBackground intensity="med" /> : null}
        {/* Aurora drift backdrop — پشت کل محتوای داشبورد */}
        <div className="dash-aurora" aria-hidden="true" />
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
