import NcImage from '@/components/NcImage/NcImage';
import {
  Calendar,
  FileText,
  Sparkles,
  Tag as TagIcon,
  User as UserIcon,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type {
  CategoryWithPostCount,
  PostWithRelations,
  UserWithProfile,
} from '@/types/types';
import s from './search-results.module.css';

type SearchResultProps = {
  q: string;
  posts: PostWithRelations[];
  categories: CategoryWithPostCount[];
  authors: UserWithProfile[];
  total: number;
};

function toFaDigits(n: number): string {
  return n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

export function SearchResult({ q, posts, categories, authors, total }: SearchResultProps) {
  return (
    <>
      {/* Results meta */}
      <div className={s.resultsMeta} role="status" aria-live="polite">
        <span>
          <span className={s.resultsCount}>{toFaDigits(total)}</span> نتیجه برای «
          <span className={s.resultsQuery}>{q}</span>»
        </span>
        <span style={{ color: 'var(--ds-text-muted)', fontSize: 'var(--ds-text-xs)' }}>
          <Sparkles size={12} strokeWidth={1.75} style={{ verticalAlign: 'middle' }} /> جستجوی هوشمند
        </span>
      </div>

      <div className={s.layout}>
        {/* Sidebar */}
        <aside className={s.sidebar} aria-label="فیلترها">
          {categories.length > 0 ? (
            <div className={s.sidebarCard}>
              <div className={s.sidebarTitle}>
                <TagIcon size={11} strokeWidth={2} aria-hidden />
                دسته‌بندی‌ها
              </div>
              <ul className={s.sidebarList}>
                {categories.map((c, i) => (
                  <li key={c.id}>
                    <Link href={`/categories/${c.slug}`} className={s.sidebarItem}>
                      <span className={s.sidebarItemNum}>{toFaDigits(i + 1)}</span>
                      <span className={s.sidebarItemName}>{c.name}</span>
                      <span style={{ color: 'var(--ds-text-muted)', fontSize: '10px' }}>
                        {toFaDigits(c._count.posts)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {authors.length > 0 ? (
            <div className={s.sidebarCard}>
              <div className={s.sidebarTitle}>
                <Users size={11} strokeWidth={2} aria-hidden />
                نویسندگان
              </div>
              <ul className={s.sidebarList}>
                {authors.map((a, i) => (
                  <li key={a.id}>
                    <Link href={`/author/${a.id}`} className={s.sidebarItem}>
                      <span className={s.sidebarItemNum}>{toFaDigits(i + 1)}</span>
                      <span className={s.sidebarItemName}>{a.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        {/* Results */}
        <div className={s.results}>
          {posts.length > 0 ? (
            <section className={s.sectionGroup}>
              <header className={s.sectionHead}>
                <h2 className={s.sectionLabel}>
                  <FileText size={15} strokeWidth={1.75} aria-hidden />
                  مقالات
                </h2>
                <span className={s.sectionCount}>{toFaDigits(posts.length)} مورد</span>
              </header>
              <div className={s.postsList}>
                {posts.map((p) => {
                  const category = p.categories?.[0];
                  return (
                    <Link key={p.id} href={`/${p.slug}`} className={s.postCard} aria-label={p.title}>
                      <div className={s.postThumb}>
                        {p.featuredImage ? (
                          <NcImage
                            src={p.featuredImage}
                            alt={p.title}
                            width={88}
                            height={88}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: '100%',
                              height: '100%',
                              color: 'var(--ds-text-muted)',
                            }}
                          >
                            <FileText size={22} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className={s.postBody}>
                        <div className={s.postMeta}>
                          {category ? <span className={s.postCategory}>{category.name}</span> : null}
                          <span>·</span>
                          <span>
                            <Calendar
                              size={11}
                              strokeWidth={1.75}
                              style={{ verticalAlign: 'middle' }}
                              aria-hidden
                            />{' '}
                            {formatDate(p.createdAt)}
                          </span>
                        </div>
                        <h3 className={s.postTitle}>{p.title}</h3>
                        {p.author ? (
                          <span className={s.postAuthor}>
                            <UserIcon
                              size={11}
                              strokeWidth={1.75}
                              style={{ verticalAlign: 'middle' }}
                              aria-hidden
                            />{' '}
                            {p.author.name}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Authors as cards if no posts */}
          {posts.length === 0 && authors.length > 0 ? (
            <section className={s.sectionGroup}>
              <header className={s.sectionHead}>
                <h2 className={s.sectionLabel}>
                  <Users size={15} strokeWidth={1.75} aria-hidden />
                  نویسندگان
                </h2>
                <span className={s.sectionCount}>{toFaDigits(authors.length)} نفر</span>
              </header>
              <div className={s.postsList}>
                {authors.map((a) => (
                  <Link key={a.id} href={`/author/${a.id}`} className={s.postCard}>
                    <div className={s.postThumb} style={{ display: 'grid', placeItems: 'center' }}>
                      {a.image || a.profile?.avatar ? (
                        <NcImage
                          src={String(a.image ?? a.profile?.avatar ?? '')}
                          alt={a.name ?? ''}
                          width={88}
                          height={88}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon size={26} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className={s.postBody}>
                      <h3 className={s.postTitle}>{a.name}</h3>
                      {a.profile?.jobName ? (
                        <span className={s.postAuthor}>{a.profile.jobName}</span>
                      ) : null}
                      {a.profile?.bio ? (
                        <span
                          className={s.postAuthor}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {a.profile.bio}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
