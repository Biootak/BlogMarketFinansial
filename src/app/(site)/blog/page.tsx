import { getCategories } from '@/actions/categoryActions';
import { getRecentPosts } from '@/actions/sidebarActions';
import Card9 from '@/components/Card9/Card9';
import SectionHeader from '@/components/SectionHeader/SectionHeader';
import { getSiteIdentity } from '@/lib/site-identity';
import type { PostWithRelations } from '@/types/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BiCategory } from 'react-icons/bi';
import { HiOutlineSparkles } from 'react-icons/hi2';
import s from './blog.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `بلاگ | ${siteName}`,
    description: `تازه‌ترین مقالات، تحلیل‌ها و روایت‌های ${siteName} از دنیای بازارهای مالی، ارزهای دیجیتال و اقتصاد.`,
    alternates: { canonical: '/blog' },
  };
}

export default function BlogIndexPage() {
  return (
    <div className={s.page}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className={s.hero}>
        <div className="container">
          <div className={s.heroInner}>
            <div className={s.heroBadge}>
              <HiOutlineSparkles aria-hidden />
              <span>بلاگ رسمی</span>
            </div>
            <h1 className={s.heroTitle}>
              روایت، تحلیل و دانش
              <br />
              از دنیای بازارهای مالی
            </h1>
            <p className={s.heroLead}>
              هر روز مقالات تازه از نویسندگان متخصص، تحلیل‌گران و اقتصاددانان منتشر می‌شود. از
              صرافی‌های ارز دیجیتال تا بازار سرمایه، هر آنچه باید بدانید اینجاست.
            </p>
            <div className={s.heroActions}>
              <Link href="/archive" className={s.primaryBtn}>
                مشاهده آرشیو کامل
              </Link>
              <Link href="/categories" className={s.secondaryBtn}>
                <BiCategory aria-hidden />
                <span>دسته‌بندی‌ها</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories compact rail ─────────────────────────── */}
      <section className={s.section}>
        <div className="container">
          <SectionHeader
            icon={<BiCategory aria-hidden />}
            title="دسته‌بندی‌ها"
            subtitle="موضوعات پرطرفدار"
            viewAll={{ label: 'همه دسته‌ها', href: '/categories' }}
          />
          <Suspense fallback={<div className={s.skelRow} />}>
            <CategoriesRow />
          </Suspense>
        </div>
      </section>

      {/* ── Most recent (3-up) ───────────────────────────────── */}
      <section className={s.section}>
        <div className="container">
          <SectionHeader
            title="تازه‌ترین مقالات"
            subtitle="نوشته‌های اخیر نویسندگان"
            viewAll={{ label: 'مشاهده همه', href: '/archive' }}
          />
          <Suspense
            fallback={
              <div className={s.grid3}>
                <div className={s.skelCard} />
                <div className={s.skelCard} />
                <div className={s.skelCard} />
              </div>
            }
          >
            <RecentPostsList />
          </Suspense>
        </div>
      </section>

      {/* ── Archive CTA ──────────────────────────────────────── */}
      <section className={s.section}>
        <div className="container">
          <div className={s.ctaCard}>
            <div>
              <h2 className={s.ctaTitle}>دنبال موضوع خاصی هستید؟</h2>
              <p className={s.ctaText}>
                آرشیو کامل مقالات با فیلتر پیشرفته، جستجوی زنده و مرتب‌سازی بر اساس تاریخ، محبوبیت و
                دسته‌بندی در دسترس است.
              </p>
            </div>
            <div className={s.ctaActions}>
              <Link href="/archive" className={s.primaryBtn}>
                رفتن به آرشیو
              </Link>
              <Link href="/search" className={s.secondaryBtn}>
                جستجو
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

async function CategoriesRow() {
  const result = await getCategories({ limit: 8, page: 1 });
  const categories = result.success ? result.data?.categories || [] : [];
  if (categories.length === 0) {
    return null;
  }
  return (
    <div className={s.catRow}>
      {categories.map((c) => (
        <Link key={c.id} href={`/categories/${c.slug}`} className={s.catChip}>
          {c.name}
        </Link>
      ))}
    </div>
  );
}

async function RecentPostsList() {
  let posts: PostWithRelations[] = [];
  try {
    posts = await getRecentPosts(9);
  } catch {
    posts = [];
  }
  if (posts.length === 0) {
    return (
      <div className={s.empty}>
        <p>هنوز مقاله‌ای منتشر نشده است. به زودی با محتوای تازه برمی‌گردیم.</p>
      </div>
    );
  }
  return (
    <div className={s.grid3}>
      {posts.map((post) => (
        <Card9 key={post.id} post={post} />
      ))}
    </div>
  );
}
