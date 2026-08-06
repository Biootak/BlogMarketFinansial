'use client';

import { AmbientBackground } from '@/components/Dashboard/primitives';
import { AnimatePresence, type Transition, type Variants, motion } from '@/lib/motion-shim';
import { usePathname } from 'next/navigation';
import { RouteFrame } from './RouteFrame';
import './HideAtlasSpine.module.css';

interface MainContentProps {
  children: React.ReactNode;
  ambient?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ children, ambient = false }) => {
  const pathname = usePathname();
  const pageVariants: Variants = { initial: { opacity: 0, y: 8 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -8 } };
  const pageTransition: Transition = { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.22 };

  return (
    <main className="dash-scope dashboard-shell__main flex-1 overflow-x-hidden">
      {ambient ? <AmbientBackground intensity="med" /> : null}
      <AnimatePresence mode="wait">
        <motion.div key={pathname} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="dashboard-shell__content relative min-h-full overflow-x-hidden at-main-content">
          <RouteFrame>{children}</RouteFrame>
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default MainContent;
