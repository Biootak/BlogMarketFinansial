// 2026-06-23: legacy alias — funnel into the canonical entry.
// 2026-08-10: query params را حفظ کن.
import { redirect } from 'next/navigation';

export default async function AliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    }
  }
  params.set('step', 'recover');
  redirect(`/auth?${params.toString()}`);
}
