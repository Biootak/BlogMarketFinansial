import QuickActions from './QuickActions';

/**
 * QuickActionsGate — Server Component shell.
 *
 * 2026-08-02: `auth()` removed from the (site) server tree. QuickActions is
 * already a client component and now reads the session via useSession()
 * internally. This lets the (site) layout stop forcing dynamic rendering on
 * every public page.
 */
const QuickActionsGate = () => {
  return <QuickActions />;
};

export default QuickActionsGate;
