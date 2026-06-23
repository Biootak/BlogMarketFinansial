// 2026-06-23: editorial header for the auth surface.
// Reads live DB facts through safeCache. The 'what's live now' line
// shows only what actually exists in the database — no fabricated stats.
//
// Two rows above the form card:
//   1. Editor eyebrow — name of the column (بازار مالی / تأیید ایمیل)
//   2. Headline — a sharp product-specific sentence
//   3. Lede — short narrative paragraph
//   4. Live strip — "اکنون در تحریریه" with categories and rate groups
//      from the actual DB; falls back gracefully if data is missing.

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

interface Pulse {
  categories: Array<{ name: string; slug: string; postsPublished: number }>;
  rateGroups: Array<{ name: string; group: string | null }>;
  recentSample: Array<{ title: string; slug: string }>;
}

const EMPTY: Pulse = { categories: [], rateGroups: [], recentSample: [] };

const getPulse = safeCache<[], Pulse>(
  async () => {
    try {
      const [cats, rates, recent] = await Promise.all([
        prisma.category.findMany({
          select: { name: true, slug: true, posts: { where: { status: 'PUBLISHED' }, select: { id: true } } },
          take: 24,
        }),
        prisma.exchangeRate.findMany({
          where: { active: true },
          orderBy: { priority: 'asc' },
          take: 6,
          select: { displayNameFa: true, name: true, group: true },
        }),
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { title: true, slug: true },
        }),
      ]);

      const categories = cats
        .map((c) => ({ name: c.name, slug: c.slug, postsPublished: c.posts.length }))
        .filter((c) => c.postsPublished > 0)
        .sort((a, b) => b.postsPublished - a.postsPublished)
        .slice(0, 5);

      const rateGroups = rates
        .map((r) => ({
          name: r.displayNameFa ?? r.name,
          group: r.group,
        }))
        .filter((r) => !!r.name);

      return { categories, rateGroups, recentSample: recent };
    } catch {
      return EMPTY;
    }
  },
  EMPTY,
  { key: 'auth-editor-pulse', ttl: 60, tags: ['posts', 'exchange-rates', 'categories'] },
);

const RATE_GROUP_LABEL: Record<string, string> = {
  'iran-forex': 'ارز',
  'iran-coin': 'سکه',
  'iran-gold': 'طلا',
  afghan: 'هرات',
  global: 'جهانی',
};

function formatFaNum(n: number): string {
  try { return n.toLocaleString('fa-IR'); } catch { return String(n); }
}

export default async function EditorPulseShell({
  eyebrow,
  intro,
  title,
  lede,
}: {
  eyebrow: string;
  intro: string;
  title: string;
  lede: string;
}) {
  const pulse = await getPulse();

  return (
    <header className="editor-band" aria-label="سرصفحهٔ بازار مالی">
      <div className="editor-band-top">
        <p className="editor-pulse-eyebrow">{eyebrow}</p>
        <h1 className="editor-pulse-title">{title}</h1>
        <p className="editor-pulse-lede">{lede}</p>
      </div>

      <div className="editor-live-strip" aria-label="اکنون در تحریریه">
        <p className="editor-live-tag">{intro}</p>

        {pulse.categories.length > 0 && (
          <div className="editor-live-row">
            <span className="editor-live-label">موضوع‌های پر پست</span>
            <ul className="editor-live-chips">
              {pulse.categories.map((c) => (
                <li key={c.slug}>
                  <span className="editor-live-chip">{c.name}</span>
                  <span className="editor-live-count" dir="ltr">
                    {formatFaNum(c.postsPublished)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pulse.rateGroups.length > 0 && (
          <div className="editor-live-row">
            <span className="editor-live-label">نرخ‌هایی که رصد می‌کنیم</span>
            <ul className="editor-live-tags">
              {pulse.rateGroups.map((g, idx) => (
                <li key={`${g.name}-${idx}`}>
                  <span>{g.name}</span>
                  {g.group ? (
                    <span className="editor-live-sub">· {RATE_GROUP_LABEL[g.group] ?? g.group}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
