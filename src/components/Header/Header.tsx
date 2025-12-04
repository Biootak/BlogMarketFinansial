import MainNav from './MainNav';

const Header = () => {
  return (
    <header className="sticky top-0 w-full z-40">
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-xl backdrop-saturate-150" />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-50/30 via-transparent to-indigo-50/30 dark:from-primary-950/20 dark:via-transparent dark:to-indigo-950/20" />
      {/* Bottom border with gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      <MainNav />
    </header>
  );
};

export default Header;
