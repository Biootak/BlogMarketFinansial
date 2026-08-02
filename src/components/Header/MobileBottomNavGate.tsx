import MobileBottomNav from './MobileBottomNav';

/**
 * MobileBottomNavGate — Server Component shell.
 *
 * 2026-08-02: `auth()` removed from the (site) server tree. The client
 * MobileBottomNav now reads the session itself via useSession() (the
 * SessionProvider is mounted in the root layout), so the header/gates no
 * longer force every public page to render dynamically.
 */
const MobileBottomNavGate = () => {
  return <MobileBottomNav />;
};

export default MobileBottomNavGate;
