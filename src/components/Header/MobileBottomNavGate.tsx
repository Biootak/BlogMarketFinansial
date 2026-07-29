import { auth } from '@/auth';
import MobileBottomNav from './MobileBottomNav';

/**
 * MobileBottomNavGate — Server Component.
 *
 * Reads the auth state from `auth()` on the server and hands it to the
 * client-only MobileBottomNav. This guarantees zero login/logout flicker
 * on first paint: the server-rendered HTML already knows who the user is.
 *
 * NOTE: `<MobileBottomNav>` is the only 'use client' island. The auth()
 * call here runs on the server, so this file must be a Server Component
 * (no 'use client' directive at the top).
 */
const MobileBottomNavGate = async () => {
  const session = await auth();
  return <MobileBottomNav isLoggedIn={!!session?.user?.id} />;
};

export default MobileBottomNavGate;
