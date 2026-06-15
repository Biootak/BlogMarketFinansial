/**
 * Header — Premium dark glassmorphism × Linear × Vercel × Stripe
 *
 * Structure:
 *  - HeaderAdBar (h-8/9, optional) — admin-controlled narrow ad at the very top
 *  - MainNav (h-12 mobile / h-14 desktop) — logo, navigation, actions
 *  - sticky + backdrop-blur
 *  - three-column symmetric layout: Logo | Navigation (center) | Actions
 *  - server component, no framer-motion
 *
 * 2026-06-14: ticker bar removed — live rates are no longer rendered here.
 *  The ad bar remains as the topmost element when active.
 */
import HeaderAdBar from './HeaderAdBar';
import MainNav from './MainNav';

const Header = () => {
  return (
    <header
      className="sticky top-0 w-full z-40 isolate"
      role="banner"
    >
      {/* Narrow ad at the very top — admin-controlled, dismissible by user */}
      <HeaderAdBar />

      {/* Translucent surface with subtle glassmorphism */}
      <div
        aria-hidden
        className="
          absolute inset-0 -z-10
          bg-white/70 dark:bg-neutral-950/70
          backdrop-blur-xl backdrop-saturate-150
          supports-[backdrop-filter]:bg-white/60
          dark:supports-[backdrop-filter]:bg-neutral-950/60
          header-glass-scrolled
        "
      />

      {/* Top inner highlight (linear.app style) */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 top-0 h-px -z-10
          bg-gradient-to-r
          from-transparent
          via-black/[0.06] dark:via-white/[0.08]
          to-transparent
        "
      />

      {/* Bottom hairline divider */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 bottom-0 h-px -z-10
          bg-neutral-200/70 dark:bg-neutral-800/70
          header-border-scrolled
        "
      />

      <MainNav />
    </header>
  );
};

export default Header;
