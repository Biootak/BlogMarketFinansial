/**
 * Header — linear.app inspired dark glassmorphism
 *
 * - Sticky, translucent surface that picks up content behind it.
 * - Subtle 1px hairline border at the bottom (linear-style).
 * - Server component — no framer-motion here, no client JS for the shell.
 * - The actual interactive bits (Navigation, dropdowns) live in their own
 *   client components.
 */
import MainNav from './MainNav';

const Header = () => {
  return (
    <header className="sticky top-0 w-full z-40" role="banner">
      {/* Translucent surface — picks up gradient/blur from main background */}
      <div
        aria-hidden
        className="
          absolute inset-0
          bg-[rgb(var(--c-surface-canvas))]/70
          dark:bg-[rgb(var(--c-surface-elevated))]/70
          backdrop-blur-xl backdrop-saturate-150
        "
      />

      {/* Subtle inner glow / top highlight, linear.app style */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 top-0 h-px
          bg-gradient-to-r
          from-transparent
          via-white/[0.06]
          to-transparent
        "
      />

      {/* Hairline divider */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 bottom-0 h-px
          bg-[rgb(var(--c-border-subtle))]
        "
      />

      <MainNav />
    </header>
  );
};

export default Header;
