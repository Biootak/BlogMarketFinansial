'use client';

import { AmbientBackground } from '@/components/Dashboard/primitives';
import { RouteFrame } from './RouteFrame';

interface MainContentProps {
  children: React.ReactNode;
  ambient?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ children, ambient = false }) => {
  return (
    <main className="dash-scope dashboard-shell__main flex-1 overflow-auto overflow-x-hidden">
      {ambient ? <AmbientBackground intensity="med" /> : null}
      <div className="dashboard-shell__content relative min-h-full overflow-x-hidden at-main-content">
        <RouteFrame>{children}</RouteFrame>
      </div>
    </main>
  );
};

export default MainContent;
