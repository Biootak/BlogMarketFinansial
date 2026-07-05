/**
 * tgju — backward-compat shim
 * ----------------------------------------------------------------------------
 * این فایل قبلاً scraper اصلی بود ولی به multi-page منتقل شد.
 * الان صرفاً re-export می‌کنه برای backward-compat با کدهای قدیمی مثل
 * `src/lib/freeMarketRates.ts` و `src/app/api/cron/sync-bazaar/route.ts`.
 *
 * استفاده‌ی جدید: از `@/lib/market-rates/tgju` ایمپورت کنید (multi-page).
 * ----------------------------------------------------------------------------
 */

export {
  fetchTgjuLatest,
  fetchTgjuPage,
  fetchAllTgjuPages,
  parseLocalizedNumber,
  ALL_TGJU_PAGE_IDS,
  type TgjuItem,
  type TgjuResponse,
  type TgjuPageId,
  type TgjuPageSpec,
  type FetchTgjuResult,
} from '@/lib/market-rates/tgju';