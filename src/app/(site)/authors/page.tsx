/**
 * @file /authors hub page
 * @description Premium editorial page that lists all active authors and
 * the categories they specialize in. Server-rendered, fully cached.
 */
import type { Metadata } from 'next';
import {
  AuthorsHero,
  AuthorsGrid,
  AuthorsExpertiseCloud,
  AuthorsCTA,
} from '@/components/AuthorsHub';
import { getAuthorsHubData } from '@/actions/getAuthorsHubData';
import { getSystemSettingsData } from '@/data/getSystemSettings';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blogmarketfinansial.ir';

export async function generateMetadata(): Promise<Metadata> {
  // `getSystemSettingsData` routes through `safeCache` (in-memory) so metadata
  // reuses the cached settings instead of hitting the DB on every request.
  const settings = await getSystemSettingsData();
  const siteName = settings.siteName ?? 'بازارهای مالی';
  const title = 'نویسندگان';
  const description =
    'با تحلیل‌گران، معامله‌گران و روزنامه‌نگاران فعال در بازارهای مالی آشنا شوید.';
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/authors` },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: `${SITE_URL}/authors`,
      type: 'website',
      siteName,
      locale: 'fa_IR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
    },
  };
}


// Dynamically rendered on demand — the shared site header reads auth(), which
// opts the whole (site) tree out of static generation (see (home)/page.tsx).
export default async function AuthorsPage() {
  const data = await getAuthorsHubData(12, 6);

  const [feature, ...rest] = data.topAuthors;
  const heroTop = data.topAuthors.slice(0, 3);

  // JSON-LD: CollectionPage of Person items for SEO.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'نویسندگان',
    description:
      'مجموعه نویسندگان فعال در پلتفرم بازارهای مالی',
    url: `${SITE_URL}/authors`,
    hasPart: data.topAuthors.slice(0, 10).map((a) => ({
      '@type': 'Person',
      name: a.name ?? 'نویسنده',
      url: `${SITE_URL}/author/${a.id}`,
      image: a.profile?.avatar ?? a.image ?? undefined,
      jobTitle: a.profile?.jobName ?? undefined,
    })),
  };

  return (
    <div
      dir="rtl"
      className="nc-PageAuthors relative bg-[color:var(--c-bg)] dark:bg-neutral-950"
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="container py-6 sm:py-10 lg:py-12 space-y-8 sm:space-y-12">
        <AuthorsHero
          totalAuthors={data.totalAuthors}
          totalPosts={data.totalPosts}
          topAuthors={heroTop}
        />

        {feature && (
          <div className="author-reveal">
            <FeaturedSpotlight
              author={feature}
              rank={1}
            />
          </div>
        )}

        <div className="author-reveal">
          <AuthorsGrid authors={rest} featuredCount={1} />
        </div>

        <div className="author-reveal">
          <AuthorsExpertiseCloud groups={data.expertise} />
        </div>

        <div className="author-reveal">
          <AuthorsCTA />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Local spotlight                              */
/* -------------------------------------------------------------------------- */
import { Sparkles, FileText } from 'lucide-react';
import AuthorAvatar from '@/components/AuthorsHub/primitives/AuthorAvatar';
import { toPersianNumber, cn } from '@/lib/utils';
import Link from 'next/link';
import type { HubAuthor } from '@/actions/getAuthorsHubData';

function FeaturedSpotlight({
  author,
  rank,
}: {
  author: HubAuthor;
  rank: number;
}) {
  const postCount = author._count?.posts ?? 0;
  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl sm:rounded-[2.5rem]',
        'border border-[color:var(--hairline)]',
        'bg-gradient-to-br from-white via-white to-amber-50/60',
        'dark:from-neutral-900 dark:via-neutral-900 dark:to-amber-900/10',
        'p-5 sm:p-7 lg:p-10',
      )}
      aria-label={`نویسنده ویژه ${author.name}`}
    >
      <span
        aria-hidden
        className="absolute -top-20 -end-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, oklch(72% 0.13 70), transparent 70%)',
        }}
      />
      <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
          <AuthorAvatar
            size="2xl"
            imgUrl={author.profile?.avatar ?? author.image ?? null}
            userName={author.name}
            halo
            showStatus
          />
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[10.5px] font-bold">
            <Sparkles className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            نویسنده ویژه · رتبه {toPersianNumber(rank)}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="text-2xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 line-clamp-1">
            {author.name ?? 'نویسنده'}
          </h2>
          {author.profile?.jobName && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {author.profile.jobName}
            </p>
          )}
          {author.profile?.bio && (
            <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 text-balance line-clamp-3">
              {author.profile.bio}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-neutral-900/60 border border-[color:var(--hairline)] px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
              <FileText className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              <span className="author-num">{toPersianNumber(postCount)}</span>
              مقاله
            </span>
            <Link
              href={`/author/${author.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full',
                'bg-primary-600 hover:bg-primary-700 text-white',
                'px-4 py-1.5 text-xs sm:text-sm font-bold',
                'transition-colors duration-200',
              )}
            >
              مشاهده پروفایل کامل
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
