import { searchAuthors, searchCategories, searchPosts } from '@/actions/search';
import type { Metadata } from 'next';
import s from './search-results.module.css';
import { SearchEmpty } from './SearchEmpty';
import { SearchResult } from './SearchResult';

export const metadata: Metadata = {
  title: 'جستجو | نتایج',
  description: 'جستجو در مقالات، دسته‌بندی‌ها و نویسندگان پلتفرم',
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = (rawQ ?? '').trim();

  // Empty / too short query — show empty state (with form)
  if (!q || q.length < 2) {
    return <SearchEmpty query={q} />;
  }

  const [postsRes, catsRes, authorsRes] = await Promise.all([
    searchPosts(q),
    searchCategories(q),
    searchAuthors(q),
  ]);

  const posts = postsRes.success && postsRes.data ? postsRes.data : [];
  const categories = catsRes.success && catsRes.data ? catsRes.data : [];
  const authors = authorsRes.success && authorsRes.data ? authorsRes.data : [];

  const total = posts.length + categories.length + authors.length;

  // No results — show empty state with suggestions
  if (total === 0) {
    return <SearchEmpty query={q} hasResults={false} />;
  }

  return (
    <div className={s.page}>
      <div className="container">
        <SearchResult q={q} posts={posts} categories={categories} authors={authors} total={total} />
      </div>
    </div>
  );
}
