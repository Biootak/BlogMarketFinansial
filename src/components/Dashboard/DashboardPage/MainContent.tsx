'use client';

import { AmbientBackground } from '@/components/Dashboard/primitives';
import { AnimatePresence, type Transition, type Variants, motion } from '@/lib/motion-shim';
import { usePathname } from 'next/navigation';

interface MainContentProps {
  children: React.ReactNode;
  /** When true, render the AmbientBackground drift behind the page content. */
  ambient?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ children, ambient = false }) => {
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

  // On desktop the sidebar is now a flex child (not fixed), so no margin
  // offset is needed — the flex layout handles spacing automatically.
  // On mobile the sidebar is a fixed overlay, so no margin either.
  return (
    <main className="dash-scope dash-grid-texture flex-1 overflow-auto">
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
