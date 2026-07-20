'use client';

import LogoSvg from '@/components/Logo/LogoSvg';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useSiteSettings } from '@/hooks/useSiteSettings';

/**
 * SidebarToggle — centered collapse/expand button for the dashboard sidebar.
 *
 * Shows the site logo (custom URL or default SVG) centered inside a
 * glass-tinted circle. Rendered as a direct child of `.dash-root` so
 * `overflow: hidden` never clips it.
 */
const SidebarToggle: React.FC = () => {
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const { logoUrl } = useSiteSettings();

  if (isMobile) return null;

  return (
    <div className="dash-side__toggle-zone" data-open={isOpen}>
      <span className="dash-side__toggle-line" aria-hidden />
      <button
        type="button"
        className="dash-side__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
        aria-expanded={isOpen}
        aria-controls="dash-side-nav"
        data-open={isOpen}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" aria-hidden className="dash-side__toggle-logo" />
        ) : (
          <LogoSvg className="dash-side__toggle-logo" />
        )}
      </button>
      <span className="dash-side__toggle-line" aria-hidden />
    </div>
  );
};

export default SidebarToggle;
