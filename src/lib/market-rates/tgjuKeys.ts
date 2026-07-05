/**
 * tgjuKeys — Central key ↔ symbol mapping برای همه‌ی صفحات tgju.org.
 * ----------------------------------------------------------------------------
 * معماری (2026-07-05):
 *   tgju.org چند صفحه دارد و هر صفحه کلیدهای متفاوتی دارد. این فایل
 *   single source of truth است برای:
 *     1) کدام `<key, value, change>` از کدام صفحه scrape می‌شود
 *     2) به کدام canonical symbol در `SYMBOL_REGISTRY` map می‌شود
 *
 * فرمت canonical key (صفحه‌محور، با prefix اضافه‌شده در parser):
 *   - homepage:        `price_dollar_rl`, `sekee`, `geram18`, `ons`
 *   - transfer:        `transfer_transfer_usd`, `transfer_transfer_usd2` (دلار شرکتی/شخصی)
 *   - currency:        `currency_price_dollar_rl`, `currency_price_eur`, …
 *   - currency-minor:  `minor_price_zar`, `minor_price_idr`, …
 *   - bank:            `bank_bank_usd`, `bank_bank_eur`, …
 *   - coin:            `coin_sekee`, `coin_sekeb`, `bubble_emami`, `bubble_bahar`, …
 *   - sana:            `sana_sana_buy_usd`, `sana_sana_sell_usd`, …
 *   - gold-global:     `global_ons`, `global_silver`, `global_platinum`
 *   - local-markets:   `local_sekee`, `local_mesghal`, …
 *
 * هر entry یک SymbolSource دارد:
 *   - canonicalKey: کلید داخلی (TRANSFER_USD, BANK_USD, SANA_BUY_USD, …)
 *   - tgjuKey: کلید خام TGJU در صفحه‌ی مورد نظر (مثلاً 'transfer_usd')
 *   - pageId: کدام صفحه باید scrape بشه
 *   - symbol: ادغام با SYMBOL_REGISTRY entry
 *   - displayNameFa override: اگه متفاوت از registry باشه
 *
 * طراحی برای آینده:
 *   - اگه TGJU کلیدها رو عوض کنه، فقط این فایل update می‌شه
 *   - اگه خواستیم یک symbol از چند source داشته باشیم (مثل USD از
 *     homepage و transfer)، هر دو entry رو می‌ذاریم با همان canonicalSymbol
 *     ولی tgjuKey متفاوت → assembler اولویت‌بندی می‌کنه.
 * ----------------------------------------------------------------------------
 */

import type { TgjuPageId } from './tgju';
import type { SymbolRegistryEntry } from './types';

/* --------------------------------------------------------------------------
 *  Per-symbol source mapping
 *
 *  اگه از یک symbol چند source داشته باشیم، اولویت در همین آرایه مشخص
 *  می‌شه: index صفر = بالاترین اولویت.
 * ------------------------------------------------------------------------*/

export interface SymbolSource {
  /**
   * کلید canonical برای این entry.
   * مثلاً: 'TRANSFER_USD' (حواله‌ی دلار) یا 'BANK_USD' (نرخ دولتی دلار).
   * این کلید در symbol table و assembled rate ها استفاده می‌شه.
   */
  canonicalKey: string;
  /** کلید خام TGJU در صفحه‌ی مورد نظر (بدون prefix اضافه‌شده توسط parser). */
  tgjuKey: string;
  /** کدام صفحه باید scrape بشه. */
  pageId: TgjuPageId;
  /** نماد ادغام‌شده در SYMBOL_REGISTRY — پیش‌فرض از canonicalKey برداشته می‌شه. */
  symbol: string;
  /** توضیح فارسی (برای UI). اختیاری. */
  displayNameFa?: string;
  /** گروه برای فیلتر. اختیاری؛ از registry ارث می‌بره اگه موجود نباشه. */
  group?: SymbolRegistryEntry['group'];
  /** ضریب تبدیل واحد. پیش‌فرض: 10 (ریال → تومان). */
  divisor?: number;
  /**
   * برای transfer/sana rates: جفت خرید/فروش.
   *   'buy'  → صرافی از کاربر می‌خره (sell rate صرافی)
   *   'sell' → صرافی به کاربر می‌فروشه (buy rate صرافی)
   *   'mid'  → میانگین یا هر چی صفحه برگردونده
   *   undefined → تک‌نرخی (مثل homepage)
   */
  side?: 'buy' | 'sell' | 'mid';
  /** واحد پایه برای محاسبه — پیش‌فرض 'toman'. */
  unit?: SymbolRegistryEntry['unit'];
  /** اولویت نمایش؛ پایین‌تر = بالاتر. */
  priority?: number;
}

/* --------------------------------------------------------------------------
 *  Homepage keys (تک‌نرخی — free market mid-price)
 *
 *  این‌ها مستقیماً در SYMBOL_REGISTRY به عنوان tgjuKey ثبت شدن.
 *  ولی در اینجا هم map می‌کنیم برای consistency و forward-compat.
 * ------------------------------------------------------------------------*/

export const HOMEPAGE_SYMBOLS: SymbolSource[] = [
  // Forex — اصلی‌ها (در registry هم tgjuKey دارن)
  { canonicalKey: 'IRAN_USD',       tgjuKey: 'price_dollar_rl', pageId: 'homepage', symbol: 'IRAN_USD',       group: 'iran-forex', priority: 1 },
  { canonicalKey: 'IRAN_EUR',       tgjuKey: 'price_eur',       pageId: 'homepage', symbol: 'IRAN_EUR',       group: 'iran-forex', priority: 7 },
  { canonicalKey: 'IRAN_GBP',       tgjuKey: 'price_gbp',       pageId: 'homepage', symbol: 'IRAN_GBP',       group: 'iran-forex', priority: 9 },
  { canonicalKey: 'IRAN_AED',       tgjuKey: 'price_aed',       pageId: 'homepage', symbol: 'IRAN_AED',       group: 'iran-forex', priority: 8 },
  { canonicalKey: 'IRAN_TRY',       tgjuKey: 'price_try',       pageId: 'homepage', symbol: 'IRAN_TRY',       group: 'iran-forex', priority: 11 },
  { canonicalKey: 'IRAN_CHF',       tgjuKey: 'price_chf',       pageId: 'homepage', symbol: 'IRAN_CHF',       group: 'iran-forex', priority: 17 },
  { canonicalKey: 'IRAN_CAD',       tgjuKey: 'price_cad',       pageId: 'homepage', symbol: 'IRAN_CAD',       group: 'iran-forex', priority: 18 },
  { canonicalKey: 'IRAN_AUD',       tgjuKey: 'price_aud',       pageId: 'homepage', symbol: 'IRAN_AUD',       group: 'iran-forex', priority: 19 },
  { canonicalKey: 'IRAN_CNY',       tgjuKey: 'price_cny',       pageId: 'homepage', symbol: 'IRAN_CNY',       group: 'iran-forex', priority: 12 },
  { canonicalKey: 'IRAN_JPY',       tgjuKey: 'price_jpy',       pageId: 'homepage', symbol: 'IRAN_JPY',       group: 'minor',      priority: 20 },
  { canonicalKey: 'IRAN_RUB',       tgjuKey: 'price_rub',       pageId: 'homepage', symbol: 'IRAN_RUB',       group: 'minor',      priority: 21 },
  { canonicalKey: 'IRAN_INR',       tgjuKey: 'price_inr',       pageId: 'homepage', symbol: 'IRAN_INR',       group: 'minor',      priority: 22 },

  // Coin
  { canonicalKey: 'IRAN_COIN_EMAMI', tgjuKey: 'sekee',  pageId: 'homepage', symbol: 'IRAN_COIN_EMAMI',  group: 'iran-coin' },
  { canonicalKey: 'IRAN_COIN_BAHAR', tgjuKey: 'sekeb',  pageId: 'homepage', symbol: 'IRAN_COIN_BAHAR',  group: 'iran-coin' },
  { canonicalKey: 'IRAN_COIN_NIM',   tgjuKey: 'nim',    pageId: 'homepage', symbol: 'IRAN_COIN_NIM',    group: 'iran-coin' },
  { canonicalKey: 'IRAN_COIN_ROB',   tgjuKey: 'rob',    pageId: 'homepage', symbol: 'IRAN_COIN_ROB',    group: 'iran-coin' },
  { canonicalKey: 'IRAN_COIN_GERAMI', tgjuKey: 'gerami', pageId: 'homepage', symbol: 'IRAN_COIN_GERAMI', group: 'iran-coin' },

  // Gold
  { canonicalKey: 'IRAN_GOLD_18K',     tgjuKey: 'geram18', pageId: 'homepage', symbol: 'IRAN_GOLD_18K',     group: 'iran-gold' },
  { canonicalKey: 'IRAN_GOLD_MESGHAL', tgjuKey: 'mesghal', pageId: 'homepage', symbol: 'IRAN_GOLD_MESGHAL', group: 'iran-gold' },

  // Global (طلای جهانی)
  { canonicalKey: 'GLOBAL_OUNCE_GOLD', tgjuKey: 'ons',     pageId: 'homepage', symbol: 'GLOBAL_OUNCE_GOLD', group: 'global', unit: 'usd', divisor: 1, priority: 6 },
];

/* --------------------------------------------------------------------------
 *  Transfer (حواله) — ۱۸ ارز با جفت خرید/فروش
 *
 *  نکته مهم: `transfer_usd` = شرکتی، `transfer_usd2` = شخصی
 * ------------------------------------------------------------------------*/

export const TRANSFER_SYMBOLS: SymbolSource[] = [
  // Forex اصلی
  { canonicalKey: 'TRANSFER_USD',  tgjuKey: 'transfer_usd',  pageId: 'transfer', symbol: 'TRANSFER_USD',  displayNameFa: 'حواله دلار (شرکتی)', group: 'iran-forex', side: 'mid', priority: 100 },
  { canonicalKey: 'TRANSFER_USD2', tgjuKey: 'transfer_usd2', pageId: 'transfer', symbol: 'TRANSFER_USD2', displayNameFa: 'حواله دلار (شخصی)',  group: 'iran-forex', side: 'mid', priority: 101 },
  { canonicalKey: 'TRANSFER_EUR',  tgjuKey: 'transfer_eur',  pageId: 'transfer', symbol: 'TRANSFER_EUR',  displayNameFa: 'حواله یورو',          group: 'iran-forex', side: 'mid', priority: 102 },
  { canonicalKey: 'TRANSFER_GBP',  tgjuKey: 'transfer_gbp',  pageId: 'transfer', symbol: 'TRANSFER_GBP',  displayNameFa: 'حواله پوند',          group: 'iran-forex', side: 'mid', priority: 103 },
  { canonicalKey: 'TRANSFER_AED',  tgjuKey: 'transfer_aed',  pageId: 'transfer', symbol: 'TRANSFER_AED',  displayNameFa: 'حواله درهم',          group: 'iran-forex', side: 'mid', priority: 104 },
  { canonicalKey: 'TRANSFER_CNY',  tgjuKey: 'transfer_cny',  pageId: 'transfer', symbol: 'TRANSFER_CNY',  displayNameFa: 'حواله یوان',          group: 'iran-forex', side: 'mid', priority: 105 },
  { canonicalKey: 'TRANSFER_INR',  tgjuKey: 'transfer_inr',  pageId: 'transfer', symbol: 'TRANSFER_INR',  displayNameFa: 'حواله روپیه',         group: 'minor',      side: 'mid', priority: 106 },
  { canonicalKey: 'TRANSFER_JPY',  tgjuKey: 'transfer_jpy',  pageId: 'transfer', symbol: 'TRANSFER_JPY',  displayNameFa: 'حواله ین',            group: 'minor',      side: 'mid', priority: 107 },
  { canonicalKey: 'TRANSFER_RUB',  tgjuKey: 'transfer_rub',  pageId: 'transfer', symbol: 'TRANSFER_RUB',  displayNameFa: 'حواله روبل',          group: 'minor',      side: 'mid', priority: 108 },
  { canonicalKey: 'TRANSFER_TRY',  tgjuKey: 'transfer_try',  pageId: 'transfer', symbol: 'TRANSFER_TRY',  displayNameFa: 'حواله لیر',           group: 'minor',      side: 'mid', priority: 109 },
  // سایر
  { canonicalKey: 'TRANSFER_CHF',  tgjuKey: 'transfer_chf',  pageId: 'transfer', symbol: 'TRANSFER_CHF',  displayNameFa: 'حواله فرانک',         group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_CAD',  tgjuKey: 'transfer_cad',  pageId: 'transfer', symbol: 'TRANSFER_CAD',  displayNameFa: 'حواله دلار کانادا',   group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_AUD',  tgjuKey: 'transfer_aud',  pageId: 'transfer', symbol: 'TRANSFER_AUD',  displayNameFa: 'حواله دلار استرالیا', group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_NZD',  tgjuKey: 'transfer_nzd',  pageId: 'transfer', symbol: 'TRANSFER_NZD',  displayNameFa: 'حواله دلار نیوزلند',  group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_SEK',  tgjuKey: 'transfer_sek',  pageId: 'transfer', symbol: 'TRANSFER_SEK',  displayNameFa: 'حواله کرون سوئد',     group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_KWD',  tgjuKey: 'transfer_kwd',  pageId: 'transfer', symbol: 'TRANSFER_KWD',  displayNameFa: 'حواله دینار کویت',    group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_OMR',  tgjuKey: 'transfer_omr',  pageId: 'transfer', symbol: 'TRANSFER_OMR',  displayNameFa: 'حواله ریال عمان',     group: 'minor',      side: 'mid' },
  { canonicalKey: 'TRANSFER_MYR',  tgjuKey: 'transfer_myr',  pageId: 'transfer', symbol: 'TRANSFER_MYR',  displayNameFa: 'حواله رینگیت',         group: 'minor',      side: 'mid' },
];

/* --------------------------------------------------------------------------
 *  Currency (بازار آزاد — ۳۶ ارز، overlap با homepage)
 *
 *  این‌ها صفحه‌ی کامل‌تر forex هستن؛ همان value های homepage رو
 *  برمی‌گردونن ولی ساختار با low/high/time.Assembler اولویت می‌ده
 *  به اگه یک symbol از چند source بیاد.
 * ------------------------------------------------------------------------*/

export const CURRENCY_SYMBOLS: SymbolSource[] = [
  { canonicalKey: 'CURRENCY_USD', tgjuKey: 'price_dollar_rl', pageId: 'currency', symbol: 'CURRENCY_USD', displayNameFa: 'دلار بازار آزاد',  group: 'iran-forex', priority: 1 },
  { canonicalKey: 'CURRENCY_EUR', tgjuKey: 'price_eur',       pageId: 'currency', symbol: 'CURRENCY_EUR', displayNameFa: 'یورو بازار آزاد',  group: 'iran-forex' },
  { canonicalKey: 'CURRENCY_GBP', tgjuKey: 'price_gbp',       pageId: 'currency', symbol: 'CURRENCY_GBP', displayNameFa: 'پوند بازار آزاد',  group: 'iran-forex' },
  { canonicalKey: 'CURRENCY_AED', tgjuKey: 'price_aed',       pageId: 'currency', symbol: 'CURRENCY_AED', displayNameFa: 'درهم بازار آزاد',  group: 'iran-forex' },
  { canonicalKey: 'CURRENCY_AFN', tgjuKey: 'price_afn',       pageId: 'currency', symbol: 'CURRENCY_AFN', displayNameFa: 'افغانی',             group: 'afghan',   priority: 3 },
  // سایر (IQD · SYP · KWD · SAR · …)
  { canonicalKey: 'CURRENCY_IQD', tgjuKey: 'price_iqd',       pageId: 'currency', symbol: 'CURRENCY_IQD', displayNameFa: 'دینار عراق',         group: 'minor' },
  { canonicalKey: 'CURRENCY_SYP', tgjuKey: 'price_syp',       pageId: 'currency', symbol: 'CURRENCY_SYP', displayNameFa: 'لیر سوریه',          group: 'minor' },
  { canonicalKey: 'CURRENCY_KWD', tgjuKey: 'price_kwd',       pageId: 'currency', symbol: 'CURRENCY_KWD', displayNameFa: 'دینار کویت',         group: 'minor' },
  { canonicalKey: 'CURRENCY_SAR', tgjuKey: 'price_sar',       pageId: 'currency', symbol: 'CURRENCY_SAR', displayNameFa: 'ریال عربستان',       group: 'minor' },
  { canonicalKey: 'CURRENCY_QAR', tgjuKey: 'price_qar',       pageId: 'currency', symbol: 'CURRENCY_QAR', displayNameFa: 'ریال قطر',           group: 'minor' },
  { canonicalKey: 'CURRENCY_OMR', tgjuKey: 'price_omr',       pageId: 'currency', symbol: 'CURRENCY_OMR', displayNameFa: 'ریال عمان',          group: 'minor' },
  { canonicalKey: 'CURRENCY_BHD', tgjuKey: 'price_bhd',       pageId: 'currency', symbol: 'CURRENCY_BHD', displayNameFa: 'دینار بحرین',        group: 'minor' },
  { canonicalKey: 'CURRENCY_SEK', tgjuKey: 'price_sek',       pageId: 'currency', symbol: 'CURRENCY_SEK', displayNameFa: 'کرون سوئد',          group: 'minor' },
  { canonicalKey: 'CURRENCY_NOK', tgjuKey: 'price_nok',       pageId: 'currency', symbol: 'CURRENCY_NOK', displayNameFa: 'کرون نروژ',          group: 'minor' },
  { canonicalKey: 'CURRENCY_DKK', tgjuKey: 'price_dkk',       pageId: 'currency', symbol: 'CURRENCY_DKK', displayNameFa: 'کرون دانمارک',       group: 'minor' },
  { canonicalKey: 'CURRENCY_MYR', tgjuKey: 'price_myr',       pageId: 'currency', symbol: 'CURRENCY_MYR', displayNameFa: 'رینگیت مالزی',       group: 'minor' },
  { canonicalKey: 'CURRENCY_SGD', tgjuKey: 'price_sgd',       pageId: 'currency', symbol: 'CURRENCY_SGD', displayNameFa: 'دلار سنگاپور',       group: 'minor' },
  { canonicalKey: 'CURRENCY_THB', tgjuKey: 'price_thb',       pageId: 'currency', symbol: 'CURRENCY_THB', displayNameFa: 'بات تایلند',          group: 'minor' },
  { canonicalKey: 'CURRENCY_AZN', tgjuKey: 'price_azn',       pageId: 'currency', symbol: 'CURRENCY_AZN', displayNameFa: 'منات آذربایجان',     group: 'minor' },
  { canonicalKey: 'CURRENCY_AMD', tgjuKey: 'price_amd',       pageId: 'currency', symbol: 'CURRENCY_AMD', displayNameFa: 'درام ارمنستان',       group: 'minor' },
  { canonicalKey: 'CURRENCY_KGS', tgjuKey: 'price_kgs',       pageId: 'currency', symbol: 'CURRENCY_KGS', displayNameFa: 'سوم قرقیزستان',      group: 'minor' },
  { canonicalKey: 'CURRENCY_KRW', tgjuKey: 'price_krw',       pageId: 'currency', symbol: 'CURRENCY_KRW', displayNameFa: 'وون کره',            group: 'minor' },
  { canonicalKey: 'CURRENCY_PKR', tgjuKey: 'price_pkr',       pageId: 'currency', symbol: 'CURRENCY_PKR', displayNameFa: 'روپیه پاکستان',      group: 'minor' },
  { canonicalKey: 'CURRENCY_TJS', tgjuKey: 'price_tjs',       pageId: 'currency', symbol: 'CURRENCY_TJS', displayNameFa: 'سامانی تاجیکستان',   group: 'minor' },
  { canonicalKey: 'CURRENCY_TMT', tgjuKey: 'price_tmt',       pageId: 'currency', symbol: 'CURRENCY_TMT', displayNameFa: 'منات ترکمنستان',     group: 'minor' },
  { canonicalKey: 'CURRENCY_HKD', tgjuKey: 'price_hkd',       pageId: 'currency', symbol: 'CURRENCY_HKD', displayNameFa: 'دلار هنگ‌کنگ',       group: 'minor' },
  { canonicalKey: 'CURRENCY_GEL', tgjuKey: 'price_gel',       pageId: 'currency', symbol: 'CURRENCY_GEL', displayNameFa: 'لاری گرجستان',       group: 'minor' },
  { canonicalKey: 'CURRENCY_NZD', tgjuKey: 'price_nzd',       pageId: 'currency', symbol: 'CURRENCY_NZD', displayNameFa: 'دلار نیوزلند',       group: 'minor' },
];

/* --------------------------------------------------------------------------
 *  Currency-minor (سایر اسعار — ۱۰۰ ارز دیگر، برای فیلتر "همه")
 * ------------------------------------------------------------------------*/

export const CURRENCY_MINOR_SYMBOLS: SymbolSource[] = [
  // نمونه‌های پرکاربرد برای فیلتر همه (assembler فقط active ها رو load می‌کنه)
  { canonicalKey: 'MINOR_TRY',  tgjuKey: 'price_try',  pageId: 'currency-minor', symbol: 'MINOR_TRY',  displayNameFa: 'لیر ترکیه',  group: 'minor' },
  { canonicalKey: 'MINOR_ZAR',  tgjuKey: 'price_zar',  pageId: 'currency-minor', symbol: 'MINOR_ZAR',  displayNameFa: 'راند آفریقا', group: 'minor' },
  { canonicalKey: 'MINOR_IDR',  tgjuKey: 'price_idr',  pageId: 'currency-minor', symbol: 'MINOR_IDR',  displayNameFa: 'روپیه اندونزی', group: 'minor' },
  { canonicalKey: 'MINOR_BRL',  tgjuKey: 'price_brl',  pageId: 'currency-minor', symbol: 'MINOR_BRL',  displayNameFa: 'رئال برزیل',  group: 'minor' },
  { canonicalKey: 'MINOR_MXN',  tgjuKey: 'price_mxn',  pageId: 'currency-minor', symbol: 'MINOR_MXN',  displayNameFa: 'پزو مکزیک',   group: 'minor' },
  { canonicalKey: 'MINOR_EGP',  tgjuKey: 'price_egp',  pageId: 'currency-minor', symbol: 'MINOR_EGP',  displayNameFa: 'پوند مصر',    group: 'minor' },
  { canonicalKey: 'MINOR_PHP',  tgjuKey: 'price_php',  pageId: 'currency-minor', symbol: 'MINOR_PHP',  displayNameFa: 'پزو فیلیپین', group: 'minor' },
  { canonicalKey: 'MINOR_VND',  tgjuKey: 'price_vnd',  pageId: 'currency-minor', symbol: 'MINOR_VND',  displayNameFa: 'دونگ ویتنام', group: 'minor' },
  { canonicalKey: 'MINOR_UAH',  tgjuKey: 'price_uah',  pageId: 'currency-minor', symbol: 'MINOR_UAH',  displayNameFa: 'هریونیا اوکراین', group: 'minor' },
  { canonicalKey: 'MINOR_PLN',  tgjuKey: 'price_pln',  pageId: 'currency-minor', symbol: 'MINOR_PLN',  displayNameFa: 'زلوتی لهستان', group: 'minor' },
  { canonicalKey: 'MINOR_CZK',  tgjuKey: 'price_czk',  pageId: 'currency-minor', symbol: 'MINOR_CZK',  displayNameFa: 'کرون چک',     group: 'minor' },
  { canonicalKey: 'MINOR_HUF',  tgjuKey: 'price_huf',  pageId: 'currency-minor', symbol: 'MINOR_HUF',  displayNameFa: 'فورینت مجارستان', group: 'minor' },
  { canonicalKey: 'MINOR_RON',  tgjuKey: 'price_ron',  pageId: 'currency-minor', symbol: 'MINOR_RON',  displayNameFa: 'لئو رومانی',  group: 'minor' },
  { canonicalKey: 'MINOR_MAD',  tgjuKey: 'price_mad',  pageId: 'currency-minor', symbol: 'MINOR_MAD',  displayNameFa: 'درهم مراکش',  group: 'minor' },
  { canonicalKey: 'MINOR_TND',  tgjuKey: 'price_tnd',  pageId: 'currency-minor', symbol: 'MINOR_TND',  displayNameFa: 'دینار تونس',  group: 'minor' },
  { canonicalKey: 'MINOR_LYD',  tgjuKey: 'price_lyd',  pageId: 'currency-minor', symbol: 'MINOR_LYD',  displayNameFa: 'دینار لیبی',  group: 'minor' },
];

/* --------------------------------------------------------------------------
 *  Bank (نرخ دولتی / مبادله‌ای — parallel به بازار آزاد)
 * ------------------------------------------------------------------------*/

export const BANK_SYMBOLS: SymbolSource[] = [
  { canonicalKey: 'BANK_USD', tgjuKey: 'bank_usd', pageId: 'bank', symbol: 'BANK_USD', displayNameFa: 'دلار (بانکی)',     group: 'iran-forex', priority: 1 },
  { canonicalKey: 'BANK_EUR', tgjuKey: 'bank_eur', pageId: 'bank', symbol: 'BANK_EUR', displayNameFa: 'یورو (بانکی)',      group: 'iran-forex' },
  { canonicalKey: 'BANK_GBP', tgjuKey: 'bank_gbp', pageId: 'bank', symbol: 'BANK_GBP', displayNameFa: 'پوند (بانکی)',      group: 'iran-forex' },
  { canonicalKey: 'BANK_AED', tgjuKey: 'bank_aed', pageId: 'bank', symbol: 'BANK_AED', displayNameFa: 'درهم (بانکی)',      group: 'iran-forex' },
  { canonicalKey: 'BANK_AFN', tgjuKey: 'bank_afn', pageId: 'bank', symbol: 'BANK_AFN', displayNameFa: 'افغانی (بانکی)',     group: 'afghan',   priority: 3 },
  { canonicalKey: 'BANK_CNY', tgjuKey: 'bank_cny', pageId: 'bank', symbol: 'BANK_CNY', displayNameFa: 'یوان (بانکی)',      group: 'minor' },
  { canonicalKey: 'BANK_JPY', tgjuKey: 'bank_jpy', pageId: 'bank', symbol: 'BANK_JPY', displayNameFa: 'ین (بانکی)',         group: 'minor' },
  { canonicalKey: 'BANK_RUB', tgjuKey: 'bank_rub', pageId: 'bank', symbol: 'BANK_RUB', displayNameFa: 'روبل (بانکی)',       group: 'minor' },
  { canonicalKey: 'BANK_INR', tgjuKey: 'bank_inr', pageId: 'bank', symbol: 'BANK_INR', displayNameFa: 'روپیه (بانکی)',      group: 'minor' },
  { canonicalKey: 'BANK_TRY', tgjuKey: 'bank_try', pageId: 'bank', symbol: 'BANK_TRY', displayNameFa: 'لیر (بانکی)',         group: 'minor' },
  { canonicalKey: 'BANK_AUD', tgjuKey: 'bank_aud', pageId: 'bank', symbol: 'BANK_AUD', displayNameFa: 'دلار استرالیا (بانکی)', group: 'minor' },
  { canonicalKey: 'BANK_CAD', tgjuKey: 'bank_cad', pageId: 'bank', symbol: 'BANK_CAD', displayNameFa: 'دلار کانادا (بانکی)',  group: 'minor' },
  { canonicalKey: 'BANK_CHF', tgjuKey: 'bank_chf', pageId: 'bank', symbol: 'BANK_CHF', displayNameFa: 'فرانک (بانکی)',       group: 'minor' },
  { canonicalKey: 'BANK_SAR', tgjuKey: 'bank_sar', pageId: 'bank', symbol: 'BANK_SAR', displayNameFa: 'ریال عربستان (بانکی)', group: 'minor' },
  { canonicalKey: 'BANK_KWD', tgjuKey: 'bank_kwd', pageId: 'bank', symbol: 'BANK_KWD', displayNameFa: 'دینار کویت (بانکی)',   group: 'minor' },
  { canonicalKey: 'BANK_QAR', tgjuKey: 'bank_qar', pageId: 'bank', symbol: 'BANK_QAR', displayNameFa: 'ریال قطر (بانکی)',     group: 'minor' },
  { canonicalKey: 'BANK_OMR', tgjuKey: 'bank_omr', pageId: 'bank', symbol: 'BANK_OMR', displayNameFa: 'ریال عمان (بانکی)',    group: 'minor' },
  { canonicalKey: 'BANK_BHD', tgjuKey: 'bank_bhd', pageId: 'bank', symbol: 'BANK_BHD', displayNameFa: 'دینار بحرین (بانکی)',  group: 'minor' },
  { canonicalKey: 'BANK_IQD', tgjuKey: 'bank_iqd', pageId: 'bank', symbol: 'BANK_IQD', displayNameFa: 'دینار عراق (بانکی)',   group: 'minor' },
  { canonicalKey: 'BANK_SYP', tgjuKey: 'bank_syp', pageId: 'bank', symbol: 'BANK_SYP', displayNameFa: 'لیر سوریه (بانکی)',    group: 'minor' },
];

/* --------------------------------------------------------------------------
 *  Coin (سکه + حباب)
 *
 *  صفحه‌ی /coin هم سکه (sekee, sekeb, nim, rob, gerami) و هم حباب
 *  (sekee_blubber, …) رو داره. parser حباب‌ها را به prefix `bubble_` می‌بره.
 * ------------------------------------------------------------------------*/

export const COIN_SYMBOLS: SymbolSource[] = [
  // سکه‌ها
  { canonicalKey: 'COIN_EMAMI', tgjuKey: 'sekee',  pageId: 'coin', symbol: 'COIN_EMAMI', displayNameFa: 'سکه امامی',         group: 'iran-coin' },
  { canonicalKey: 'COIN_BAHAR', tgjuKey: 'sekeb',  pageId: 'coin', symbol: 'COIN_BAHAR', displayNameFa: 'سکه بهار آزادی',    group: 'iran-coin' },
  { canonicalKey: 'COIN_NIM',   tgjuKey: 'nim',    pageId: 'coin', symbol: 'COIN_NIM',   displayNameFa: 'نیم سکه',           group: 'iran-coin' },
  { canonicalKey: 'COIN_ROB',   tgjuKey: 'rob',    pageId: 'coin', symbol: 'COIN_ROB',   displayNameFa: 'ربع سکه',           group: 'iran-coin' },
  { canonicalKey: 'COIN_GERAMI', tgjuKey: 'gerami', pageId: 'coin', symbol: 'COIN_GERAMI', displayNameFa: 'سکه گرمی',         group: 'iran-coin' },

  // حباب سکه (parser این‌ها را bubble_* می‌کند نه coin_*)
  // نکته: TGJU برای حباب سکه امامی از کلید `coin_blubber` استفاده می‌کند
  // (نه `sekee_blubber`). بقیه‌ی سکه‌ها `_blubber` کامل دارند.
  { canonicalKey: 'BUBBLE_EMAMI',   tgjuKey: 'coin_blubber', pageId: 'coin', symbol: 'BUBBLE_EMAMI',   displayNameFa: 'حباب سکه امامی',  group: 'iran-coin', divisor: 10 },
  { canonicalKey: 'BUBBLE_BAHAR',   tgjuKey: 'sekeb_blubber', pageId: 'coin', symbol: 'BUBBLE_BAHAR',   displayNameFa: 'حباب سکه بهار',    group: 'iran-coin', divisor: 10 },
  { canonicalKey: 'BUBBLE_NIM',     tgjuKey: 'nim_blubber',   pageId: 'coin', symbol: 'BUBBLE_NIM',     displayNameFa: 'حباب نیم سکه',     group: 'iran-coin', divisor: 10 },
  { canonicalKey: 'BUBBLE_ROB',     tgjuKey: 'rob_blubber',   pageId: 'coin', symbol: 'BUBBLE_ROB',     displayNameFa: 'حباب ربع سکه',     group: 'iran-coin', divisor: 10 },
  { canonicalKey: 'BUBBLE_GERAMI',  tgjuKey: 'gerami_blubber', pageId: 'coin', symbol: 'BUBBLE_GERAMI', displayNameFa: 'حباب سکه گرمی',    group: 'iran-coin', divisor: 10 },
];

/* --------------------------------------------------------------------------
 *  Sana (صرافی ملی — جفت خرید/فروش رسمی)
 *
 *  خیلی ارزشمند برای calculator: نرخ واقعی صرافی ملی (نه mid بازار آزاد).
 *  کلیدها: sana_buy_* (صرافی از مردم می‌خرد)، sana_sell_* (صرافی به مردم می‌فروشد)
 *
 *  ۲۳ ارز در صفحه‌ی /sana موجود است (verified 2026-07-05):
 *  USD EUR GBP AED AUD BHD CAD CHF CNY DKK INR IQD JPY KRW KWD NOK OMR PKR QAR RUB SAR SEK TRY
 *
 *  نکته مهم: assembler وقتی دو SymbolSource با یک canonicalKey (مثل SANA_USD)
 *  ولی side متفاوت پیدا کند، آن‌ها را در یک MarketRateItem ترکیب می‌کند —
 *  یعنی buy و sell در دو entry ثبت می‌شوند اما در خروجی به صورت buyValue/sellValue
 *  در یک آیتم نمایش داده می‌شوند. به همین دلیل canonicalKey اینجا به شکل SANA_USD
 *  است (نه SANA_BUY_USD).
 * ------------------------------------------------------------------------*/

export const SANA_SYMBOLS: SymbolSource[] = [
  // ── iran-forex (مهم — ۸ ارز اصلی) ─────────────────────────────
  { canonicalKey: 'SANA_USD', tgjuKey: 'sana_buy_usd',  pageId: 'sana', symbol: 'SANA_USD', displayNameFa: 'صرافی ملی دلار',   group: 'iran-forex', side: 'buy',  priority: 1 },
  { canonicalKey: 'SANA_USD', tgjuKey: 'sana_sell_usd', pageId: 'sana', symbol: 'SANA_USD', displayNameFa: 'صرافی ملی دلار',   group: 'iran-forex', side: 'sell', priority: 1 },
  { canonicalKey: 'SANA_EUR', tgjuKey: 'sana_buy_eur',  pageId: 'sana', symbol: 'SANA_EUR', displayNameFa: 'صرافی ملی یورو',   group: 'iran-forex', side: 'buy' },
  { canonicalKey: 'SANA_EUR', tgjuKey: 'sana_sell_eur', pageId: 'sana', symbol: 'SANA_EUR', displayNameFa: 'صرافی ملی یورو',   group: 'iran-forex', side: 'sell' },
  { canonicalKey: 'SANA_GBP', tgjuKey: 'sana_buy_gbp',  pageId: 'sana', symbol: 'SANA_GBP', displayNameFa: 'صرافی ملی پوند',   group: 'iran-forex', side: 'buy' },
  { canonicalKey: 'SANA_GBP', tgjuKey: 'sana_sell_gbp', pageId: 'sana', symbol: 'SANA_GBP', displayNameFa: 'صرافی ملی پوند',   group: 'iran-forex', side: 'sell' },
  { canonicalKey: 'SANA_AED', tgjuKey: 'sana_buy_aed',  pageId: 'sana', symbol: 'SANA_AED', displayNameFa: 'صرافی ملی درهم',  group: 'iran-forex', side: 'buy' },
  { canonicalKey: 'SANA_AED', tgjuKey: 'sana_sell_aed', pageId: 'sana', symbol: 'SANA_AED', displayNameFa: 'صرافی ملی درهم',  group: 'iran-forex', side: 'sell' },

  // ── iran-forex (سایر — استرالیا، کانادا، فرانک) ───────────────
  { canonicalKey: 'SANA_AUD', tgjuKey: 'sana_buy_aud',  pageId: 'sana', symbol: 'SANA_AUD', displayNameFa: 'صرافی ملی دلار استرالیا', group: 'iran-forex', side: 'buy' },
  { canonicalKey: 'SANA_AUD', tgjuKey: 'sana_sell_aud', pageId: 'sana', symbol: 'SANA_AUD', displayNameFa: 'صرافی ملی دلار استرالیا', group: 'iran-forex', side: 'sell' },
  { canonicalKey: 'SANA_CAD', tgjuKey: 'sana_buy_cad',  pageId: 'sana', symbol: 'SANA_CAD', displayNameFa: 'صرافی ملی دلار کانادا',  group: 'iran-forex', side: 'buy' },
  { canonicalKey: 'SANA_CAD', tgjuKey: 'sana_sell_cad', pageId: 'sana', symbol: 'SANA_CAD', displayNameFa: 'صرافی ملی دلار کانادا',  group: 'iran-forex', side: 'sell' },
  { canonicalKey: 'SANA_CHF', tgjuKey: 'sana_buy_chf',  pageId: 'sana', symbol: 'SANA_CHF', displayNameFa: 'صرافی ملی فرانک',        group: 'iran-forex', side: 'buy' },
  { canonicalKey: 'SANA_CHF', tgjuKey: 'sana_sell_chf', pageId: 'sana', symbol: 'SANA_CHF', displayNameFa: 'صرافی ملی فرانک',        group: 'iran-forex', side: 'sell' },

  // ── minor (سایر اسعار — آسیا، اروپا) ─────────────────────────
  { canonicalKey: 'SANA_CNY', tgjuKey: 'sana_buy_cny',  pageId: 'sana', symbol: 'SANA_CNY', displayNameFa: 'صرافی ملی یوان',        group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_CNY', tgjuKey: 'sana_sell_cny', pageId: 'sana', symbol: 'SANA_CNY', displayNameFa: 'صرافی ملی یوان',        group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_JPY', tgjuKey: 'sana_buy_jpy',  pageId: 'sana', symbol: 'SANA_JPY', displayNameFa: 'صرافی ملی ین',          group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_JPY', tgjuKey: 'sana_sell_jpy', pageId: 'sana', symbol: 'SANA_JPY', displayNameFa: 'صرافی ملی ین',          group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_KRW', tgjuKey: 'sana_buy_krw',  pageId: 'sana', symbol: 'SANA_KRW', displayNameFa: 'صرافی ملی وون',          group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_KRW', tgjuKey: 'sana_sell_krw', pageId: 'sana', symbol: 'SANA_KRW', displayNameFa: 'صرافی ملی وون',          group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_INR', tgjuKey: 'sana_buy_inr',  pageId: 'sana', symbol: 'SANA_INR', displayNameFa: 'صرافی ملی روپیه',         group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_INR', tgjuKey: 'sana_sell_inr', pageId: 'sana', symbol: 'SANA_INR', displayNameFa: 'صرافی ملی روپیه',         group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_PKR', tgjuKey: 'sana_buy_pkr',  pageId: 'sana', symbol: 'SANA_PKR', displayNameFa: 'صرافی ملی روپیه پاکستان',  group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_PKR', tgjuKey: 'sana_sell_pkr', pageId: 'sana', symbol: 'SANA_PKR', displayNameFa: 'صرافی ملی روپیه پاکستان',  group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_RUB', tgjuKey: 'sana_buy_rub',  pageId: 'sana', symbol: 'SANA_RUB', displayNameFa: 'صرافی ملی روبل',          group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_RUB', tgjuKey: 'sana_sell_rub', pageId: 'sana', symbol: 'SANA_RUB', displayNameFa: 'صرافی ملی روبل',          group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_TRY', tgjuKey: 'sana_buy_try',  pageId: 'sana', symbol: 'SANA_TRY', displayNameFa: 'صرافی ملی لیر',           group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_TRY', tgjuKey: 'sana_sell_try', pageId: 'sana', symbol: 'SANA_TRY', displayNameFa: 'صرافی ملی لیر',           group: 'minor', side: 'sell' },

  // ── کرون اسکاندیناوی ─────────────────────────────────────
  { canonicalKey: 'SANA_DKK', tgjuKey: 'sana_buy_dkk',  pageId: 'sana', symbol: 'SANA_DKK', displayNameFa: 'صرافی ملی کرون دانمارک',  group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_DKK', tgjuKey: 'sana_sell_dkk', pageId: 'sana', symbol: 'SANA_DKK', displayNameFa: 'صرافی ملی کرون دانمارک',  group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_NOK', tgjuKey: 'sana_buy_nok',  pageId: 'sana', symbol: 'SANA_NOK', displayNameFa: 'صرافی ملی کرون نروژ',    group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_NOK', tgjuKey: 'sana_sell_nok', pageId: 'sana', symbol: 'SANA_NOK', displayNameFa: 'صرافی ملی کرون نروژ',    group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_SEK', tgjuKey: 'sana_buy_sek',  pageId: 'sana', symbol: 'SANA_SEK', displayNameFa: 'صرافی ملی کرون سوئد',    group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_SEK', tgjuKey: 'sana_sell_sek', pageId: 'sana', symbol: 'SANA_SEK', displayNameFa: 'صرافی ملی کرون سوئد',    group: 'minor', side: 'sell' },

  // ── کشورهای عربی ─────────────────────────────────────────
  { canonicalKey: 'SANA_SAR', tgjuKey: 'sana_buy_sar',  pageId: 'sana', symbol: 'SANA_SAR', displayNameFa: 'صرافی ملی ریال عربستان',  group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_SAR', tgjuKey: 'sana_sell_sar', pageId: 'sana', symbol: 'SANA_SAR', displayNameFa: 'صرافی ملی ریال عربستان',  group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_QAR', tgjuKey: 'sana_buy_qar',  pageId: 'sana', symbol: 'SANA_QAR', displayNameFa: 'صرافی ملی ریال قطر',      group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_QAR', tgjuKey: 'sana_sell_qar', pageId: 'sana', symbol: 'SANA_QAR', displayNameFa: 'صرافی ملی ریال قطر',      group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_OMR', tgjuKey: 'sana_buy_omr',  pageId: 'sana', symbol: 'SANA_OMR', displayNameFa: 'صرافی ملی ریال عمان',     group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_OMR', tgjuKey: 'sana_sell_omr', pageId: 'sana', symbol: 'SANA_OMR', displayNameFa: 'صرافی ملی ریال عمان',     group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_BHD', tgjuKey: 'sana_buy_bhd',  pageId: 'sana', symbol: 'SANA_BHD', displayNameFa: 'صرافی ملی دینار بحرین',   group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_BHD', tgjuKey: 'sana_sell_bhd', pageId: 'sana', symbol: 'SANA_BHD', displayNameFa: 'صرافی ملی دینار بحرین',   group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_KWD', tgjuKey: 'sana_buy_kwd',  pageId: 'sana', symbol: 'SANA_KWD', displayNameFa: 'صرافی ملی دینار کویت',    group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_KWD', tgjuKey: 'sana_sell_kwd', pageId: 'sana', symbol: 'SANA_KWD', displayNameFa: 'صرافی ملی دینار کویت',    group: 'minor', side: 'sell' },
  { canonicalKey: 'SANA_IQD', tgjuKey: 'sana_buy_iqd',  pageId: 'sana', symbol: 'SANA_IQD', displayNameFa: 'صرافی ملی دینار عراق',    group: 'minor', side: 'buy' },
  { canonicalKey: 'SANA_IQD', tgjuKey: 'sana_sell_iqd', pageId: 'sana', symbol: 'SANA_IQD', displayNameFa: 'صرافی ملی دینار عراق',    group: 'minor', side: 'sell' },
];

/* --------------------------------------------------------------------------
 *  Gold-global (طلا/نقره/پلاتین جهانی — USD/oz)
 * ------------------------------------------------------------------------*/

export const GOLD_GLOBAL_SYMBOLS: SymbolSource[] = [
  { canonicalKey: 'GOLD_OUNCE',     tgjuKey: 'ons',        pageId: 'gold-global', symbol: 'GOLD_OUNCE',     displayNameFa: 'انس طلا',         group: 'global', unit: 'usd', divisor: 1, priority: 1 },
  { canonicalKey: 'GOLD_PALLADIUM', tgjuKey: 'palladium',  pageId: 'gold-global', symbol: 'GOLD_PALLADIUM', displayNameFa: 'انس پالادیوم',    group: 'global', unit: 'usd', divisor: 1 },
  { canonicalKey: 'GOLD_PLATINUM',  tgjuKey: 'platinum',   pageId: 'gold-global', symbol: 'GOLD_PLATINUM',  displayNameFa: 'انس پلاتین',      group: 'global', unit: 'usd', divisor: 1 },
  { canonicalKey: 'GOLD_SILVER',    tgjuKey: 'silver',     pageId: 'gold-global', symbol: 'GOLD_SILVER',    displayNameFa: 'انس نقره',         group: 'global', unit: 'usd', divisor: 1 },
];

/* --------------------------------------------------------------------------
 *  Flat list — همه‌ی sources یک‌جا
 * ------------------------------------------------------------------------*/

export const ALL_TGJU_SYMBOLS: readonly SymbolSource[] = [
  ...HOMEPAGE_SYMBOLS,
  ...TRANSFER_SYMBOLS,
  ...CURRENCY_SYMBOLS,
  ...CURRENCY_MINOR_SYMBOLS,
  ...BANK_SYMBOLS,
  ...COIN_SYMBOLS,
  ...SANA_SYMBOLS,
  ...GOLD_GLOBAL_SYMBOLS,
];

/* --------------------------------------------------------------------------
 *  Lookup maps
 * ------------------------------------------------------------------------*/

/**
 * Lookup: (pageId, tgjuKey) → SymbolSource.
 * در assembler برای resolve کردن این که {value, change} چه symbol ای رو
 * نشون می‌ده استفاده می‌شه.
 */
export const TGJU_KEY_TO_SOURCE: ReadonlyMap<string, SymbolSource> = new Map(
  ALL_TGJU_SYMBOLS.map((s) => [`${s.pageId}:${s.tgjuKey}`, s]),
);

/**
 * Lookup: canonicalKey (TRANSFER_USD) → همه‌ی SymbolSource هایی که این کلید را دارند.
 *
 * نکته: ممکنه چندین source با یک canonicalKey وجود داشته باشه (مثل SANA_USD
 * که دو entry با side='buy' و side='sell' دارد). assembler از این لیست استفاده
 * می‌کند تا برای نرخ‌های صرافی ملی، buy/sell جداگانه پر شود.
 */
export const CANONICAL_KEY_TO_SOURCES: ReadonlyMap<string, readonly SymbolSource[]> = (() => {
  const m = new Map<string, SymbolSource[]>();
  for (const s of ALL_TGJU_SYMBOLS) {
    const arr = m.get(s.canonicalKey);
    if (arr) arr.push(s);
    else m.set(s.canonicalKey, [s]);
  }
  return m;
})();

/**
 * Backward-compat: Lookup: canonicalKey (TRANSFER_USD) → اولین SymbolSource.
 * برای کدهایی که فقط یک source نیاز دارند. برای SANA-style (دو side) فقط
 * یکی برمی‌گرداند — برای دسترسی به همه از CANONICAL_KEY_TO_SOURCES استفاده کنید.
 */
export const CANONICAL_KEY_TO_SOURCE: ReadonlyMap<string, SymbolSource> = new Map(
  ALL_TGJU_SYMBOLS.map((s) => [s.canonicalKey, s]),
);