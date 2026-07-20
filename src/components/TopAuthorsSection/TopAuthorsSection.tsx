import type { TopAuthor } from '@/actions/getTopAuthors';
import AuthorAvatar from '@/components/AuthorsHub/primitives/AuthorAvatar';
import { SectionHeader } from '@/components/SectionHeader';
import { cn, toPersianNumber } from '@/lib/utils';
import { ArrowUpLeft, Crown, FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';
/**
 * @file TopAuthorsSection
 * @description بازطراحی ۲۰۲۶ — premium ambient section "صدای برتر".
 * ساختار: feature card (رتبه ۱) + grid/scroll rail (رتبه‌های بعدی).
 * CSS در module مجاور. هیچ client JS نیست — server-renderable.
 *
 * fixes (2026):
 *  - feature: flex-row ثابت (نه grid) — rank/avatar/copy/stat هر کدام جدا
 *  - rail: group-hover حذف شد، hover مستقیم روی .railCard در CSS
 *  - dark mode: :global(.dark) در module CSS
 *  - rail: grid auto-fill روی دسکتاپ، flex-scroll روی موبایل
 */
import type * as React from 'react';
import styles from './TopAuthorsSection.module.css';

export interface TopAuthorsSectionProps {
  authors: TopAuthor[];
  className?: string;
  /** Optional title override (default: "صدای برتر") */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Max number of authors to display. Default = 6. */
  limit?: number;
}

const RANK_SILVER = 'from-neutral-200 via-neutral-300 to-neutral-500 text-neutral-900';
const RANK_BRONZE = 'from-orange-300 via-orange-500 to-orange-700 text-orange-50';

const TopAuthorsSection: React.FC<TopAuthorsSectionProps> = ({
  authors,
  className,
  title = 'صدای برتر',
  subtitle,
  limit = 6,
}) => {
  const sorted = [...authors]
    .sort((a, b) => (b._count?.posts ?? 0) - (a._count?.posts ?? 0))
    .slice(0, limit);

  if (sorted.length === 0) return null;

  const [feature, ...rest] = sorted;
  const featureCount = feature._count?.posts ?? 0;
  const featureJob = feature.profile?.jobName ?? 'نویسنده';
  const featureBio = feature.profile?.bio ?? '';
  const featureName = feature.name?.trim() || 'نویسنده';
  const featureAvatar = feature.profile?.avatar ?? feature.image ?? null;

  return (
    <section dir="rtl" className={cn(styles.root, className)} aria-label={title}>
      {/* aurora blobs */}
      <span aria-hidden className={cn(styles.aurora, styles.auroraA)} />
      <span aria-hidden className={cn(styles.aurora, styles.auroraB)} />
      {/* dot-grid texture */}
      <span aria-hidden className={styles.dotGrid} />

      <div className={styles.inner}>
        {/* ── Section Header ─────────────────────────────────── */}
        <SectionHeader
          icon={<Crown className="h-4 w-4" strokeWidth={2.25} />}
          title={title}
          subtitle={
            subtitle ??
            `${toPersianNumber(sorted.length)} نویسنده و تحلیلگر فعال این ماه`
          }
          accent="amber"
          viewAll={{ label: 'مشاهده همه', href: '/authors' }}
        />

        {/* ── Feature card (rank 1) — flex-row ثابت ──────────── */}
        {feature && (
          <Link
            href={`/author/${feature.id}`}
            className={styles.feature}
            aria-label={`مشاهده پروفایل ${featureName}، نویسنده رتبه اول`}
          >
            {/* rank badge + avatar — همیشه کنار هم */}
            <div className={styles.featureAvatarGroup}>
              <span className={styles.rank1} aria-label="رتبه اول">
                <Crown className="h-3.5 w-3.5 text-amber-950" strokeWidth={2.5} aria-hidden />
              </span>
              <AuthorAvatar
                size="xl"
                imgUrl={featureAvatar}
                userName={featureName}
                halo
                ringClassName="ring-[3px] ring-white/80 dark:ring-neutral-900/80"
              />
            </div>

            {/* copy */}
            <div className={styles.featureBody}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-base sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 transition-colors truncate">
                  {featureName}
                </h3>
                <span className="author-chip">
                  <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                  {featureJob}
                </span>
              </div>
              {featureBio && (
                <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-2">
                  {featureBio}
                </p>
              )}
            </div>

            {/* stat + CTA */}
            <div className={styles.featureStat}>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full',
                  'bg-neutral-100/80 dark:bg-neutral-800/70',
                  'text-neutral-700 dark:text-neutral-200',
                  'px-2.5 py-1 text-[11.5px] font-medium',
                  'transition-colors duration-200',
                )}
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                <span className="author-num">{toPersianNumber(featureCount)}</span>
                <span>مقاله</span>
              </span>
              <span className={styles.featureCta} aria-hidden>
                مشاهده پروفایل
                <ArrowUpLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            </div>
          </Link>
        )}

        {/* ── Rail cards (rank 2+) ──────────────────────────── */}
        {rest.length > 0 && (
          <div className={styles.rail} aria-label="سایر نویسندگان برتر">
            {rest.map((author, idx) => {
              const count = author._count?.posts ?? 0;
              const job = author.profile?.jobName ?? 'نویسنده';
              const name = author.name?.trim() || 'نویسنده';
              const avatar = author.profile?.avatar ?? author.image ?? null;
              const rank = idx + 2; // feature is rank 1

              return (
                <Link
                  key={author.id}
                  href={`/author/${author.id}`}
                  className={styles.railCard}
                  aria-label={`مشاهده پروفایل ${name}`}
                >
                  {/* rank badge for top 3 */}
                  {rank <= 3 && (
                    <span
                      className={cn(
                        styles.rankBadge,
                        'bg-gradient-to-br',
                        rank === 2 ? RANK_SILVER : RANK_BRONZE,
                      )}
                      aria-label={`رتبه ${toPersianNumber(rank)}`}
                    >
                      {toPersianNumber(rank)}
                    </span>
                  )}

                  <AuthorAvatar
                    size="lg"
                    imgUrl={avatar}
                    userName={name}
                    ringClassName="ring-2 ring-white/80 dark:ring-neutral-900/80"
                  />

                  {/* FIX #2: متن با کلاس‌های CSS module — hover از .railCard:hover .railCardName */}
                  <div className="w-full min-w-0">
                    <p className={styles.railCardName}>{name}</p>
                    <p className={cn(styles.railCardJob, 'mt-0.5')}>{job}</p>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full mt-auto',
                      'bg-neutral-100/80 dark:bg-neutral-800/70',
                      'text-neutral-600 dark:text-neutral-300',
                      'px-2 py-0.5 text-[10.5px] font-medium',
                    )}
                  >
                    <FileText className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                    <span className="author-num">{toPersianNumber(count)}</span>
                    <span>مقاله</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TopAuthorsSection;
