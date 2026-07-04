-- 2026-07-04: PageView daily buckets
--
-- Before: one row per URL (UNIQUE(page)) — views was a lifetime counter,
-- so getViewStatsByPeriod's `groupBy({by:['date']})` could only see the
-- seed rows, leaving 30d/90d charts empty.
--
-- After: one row per (page, date) — /api/pageview upserts into today's
-- bucket and the dashboard widget reads real daily series.
--
-- Migration steps:
--   1. Backfill: any existing PageView with date != createdAt gets a
--      duplicate row at createdAt so historical views aren't lost.
--      (Today the seed writes both date and createdAt close together,
--      so this is mostly a no-op — but it's safe for live rows that
--      had `date` updated by some forgotten code path.)
--   2. Drop the old `[page]` unique constraint.
--   3. Add the new `[page, date]` unique constraint.

-- Step 1: backfill. Copy rows where date differs from createdAt so we
-- don't lose the lifetime views. New row has date=createdAt, same views.
INSERT INTO "PageView" (id, page, views, date, "createdAt", "updatedAt")
SELECT
  'mig_' || substr(md5(random()::text), 1, 24),
  page,
  views,
  "createdAt",
  "createdAt",
  NOW()
FROM "PageView"
WHERE date::date <> "createdAt"::date
ON CONFLICT DO NOTHING;

-- Step 2: drop the old single-column unique
ALTER TABLE "PageView" DROP CONSTRAINT IF EXISTS "PageView_page_key";

-- Step 3: add the new composite unique
CREATE UNIQUE INDEX IF NOT EXISTS "PageView_page_date_key" ON "PageView" (page, date);