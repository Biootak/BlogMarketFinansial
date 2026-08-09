// 2026-06-23: legacy alias — funnel into the canonical entry.
// 2026-08-09: straight to the single-step login (email + password on one page).
import { redirect } from 'next/navigation';

export default function AliasPage() {
  redirect('/auth?step=login');
}
