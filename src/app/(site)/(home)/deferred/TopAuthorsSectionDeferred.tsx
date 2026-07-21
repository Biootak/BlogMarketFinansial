/**
 * TopAuthorsSectionDeferred — async server component that fetches its own data.
 * Wrapped in <Suspense> in page.tsx for true streaming.
 */
import { getTopAuthors } from '@/actions/getTopAuthors';
import { TopAuthorsSection } from '@/components/TopAuthorsSection';

export default async function TopAuthorsSectionDeferred() {
  const topAuthors = await getTopAuthors(5);
  if (!topAuthors.length) return null;
  return <TopAuthorsSection authors={topAuthors} />;
}
