import { auth } from '@/auth';
import QuickActions from './QuickActions';

/**
 * QuickActionsGate — Server Component.
 * Resolves auth on the server, so the FAB shows the right state (signed-in
 * menu vs. guest CTA) on the very first paint.
 */
const QuickActionsGate = async () => {
  const session = await auth();
  return (
    <QuickActions
      isLoggedIn={!!session?.user?.id}
      userRole={session?.user?.role}
    />
  );
};

export default QuickActionsGate;
