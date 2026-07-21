/**
 * PostsSection — async server component that fetches its own data.
 * Wrapped in <Suspense> in page.tsx for true streaming.
 */
import { getPosts } from '@/actions/getPosts';
import SectionMagazine7 from '@/components/Sections/SectionMagazine7';

export default async function PostsSection() {
  const posts = await getPosts(6);
  if (!posts.length) return null;
  return <SectionMagazine7 posts={posts} />;
}
