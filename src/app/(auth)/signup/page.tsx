// 2026-06-23: legacy alias — funnel into the canonical entry.
import { redirect } from 'next/navigation';


export default function AliasPage() {
  redirect('/auth?step=register');
}
