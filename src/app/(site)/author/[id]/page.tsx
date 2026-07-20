import { getAuthorProfile } from '@/actions/getAuthorProfile';
import { getTopAuthors } from '@/actions/getTopAuthors';
import {
  AuthorPostsGrid,
  AuthorProfileHero,
  AuthorRelated,
  AuthorsCTA,
} from '@/components/AuthorsHub';
/**
 * @file /author/[id] — premium editorial author profile page
 * @description Replaces the previous page that delegated to
 * `author/Author/AuthorProfile` + `AuthorContent` with a single,
 * server-rendered, premium composition. Backed by `getAuthorProfile`
 * (cached 2 min) and the existing `getTopAuthors` (cached 10 min)
 * for the related-authors rail.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blogmarketfinansial.ir';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { author } = await getAuthorProfile(id, 1, 1);
  if (!author) {
    return { title: 'نویسنده یافت نشد' };
  }
  const name = author.name?.trim() || 'نویسنده';
  const job = author.profile?.jobName ?? 'نویسنده';
  const description =
    author.profile?.bio?.slice(0, 160) ?? `مقالات و تحلیل‌های ${name} در بازارهای مالی.`;
  return {
    title: name,
    description,
    alternates: { canonical: `${SITE_URL}/author/${id}` },
    openGraph: {
      type: 'profile',
      title: `${name} | ${job}`,
      description,
      url: `${SITE_URL}/author/${id}`,
      images: author.profile?.avatar ? [{ url: author.profile.avatar, alt: name }] : undefined,
      locale: 'fa_IR',
    },
    twitter: {
      card: 'summary',
      title: `${name} | ${job}`,
      description,
    },
  };
}

// Dynamically rendered on demand — the shared site header reads auth(), which
// opts the whole (site) tree out of static generation (see (home)/page.tsx).
export default async function PageAuthor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [payload, topAuthors] = await Promise.all([getAuthorProfile(id, 1, 9), getTopAuthors(8)]);

  if (!payload.author) {
    notFound();
  }

  const name = payload.author.name?.trim() || 'نویسنده';
  const related = topAuthors.filter((a) => a.id !== payload.author?.id).slice(0, 4);

  // Aggregate stats for the 4-column hero grid
  const categoryCount = Array.from(
    new Set(payload.posts.flatMap((p) => p.categories.map((c) => c.id))),
  ).length;
  const commentCount = payload.posts.reduce((s, p) => s + (p._count?.comments ?? 0), 0);
  const likeCount = payload.posts.reduce((s, p) => s + (p._count?.likes ?? 0), 0);

  // JSON-LD: Person + ItemList of blog posts
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      url: `${SITE_URL}/author/${id}`,
      image: payload.author.profile?.avatar ?? undefined,
      jobTitle: payload.author.profile?.jobName ?? undefined,
      worksFor: payload.author.profile?.company ?? undefined,
      description: payload.author.profile?.bio ?? undefined,
      knowsAbout: payload.posts
        .flatMap((p) => p.categories.map((c) => c.name))
        .filter((value, index, self) => self.indexOf(value) === index)
        .slice(0, 8),
    },
    hasPart: payload.posts.slice(0, 10).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/single/${p.slug}`,
      datePublished: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString(),
      author: { '@type': 'Person', name },
    })),
  };

  return (
    <div dir="rtl" className="nc-PageAuthor bg-[color:var(--c-bg)] dark:bg-neutral-950">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="container py-6 sm:py-10 lg:py-12 space-y-8 sm:space-y-10 lg:space-y-12">
        <AuthorProfileHero
          author={{
            id: payload.author.id,
            name: payload.author.name,
            email: payload.author.email,
            profile: payload.author.profile,
            _count: payload.author._count,
          }}
          categoryCount={categoryCount}
          commentCount={commentCount}
          likeCount={likeCount}
        />

        <AuthorPostsGrid posts={payload.posts} />

        <AuthorRelated authors={related} />

        <AuthorsCTA />
      </div>
    </div>
  );
}
