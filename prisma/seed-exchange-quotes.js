const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ log: ['warn', 'error'] });

// ─── تنظیمات quote ها ─────────────────────────────────────────────────────────

// نرخ‌های نمونه مبتنی بر بازار تیر ۱۴۰۵ / ژوئیه ۲۰۲۶
// buyRate = صرافی از مشتری می‌خرد (مشتری می‌فروشد)
// sellRate = صرافی به مشتری می‌فروشد (مشتری می‌خرد)
const SAMPLE_QUOTES = [
  // ── نوبیتکس (صرافی دیجیتال تهران) ────────────────────────────────────────
  {
    exchangeId: 'exch_nobitex_001',
    currencyCode: 'USD',
    currencyPair: 'USD/AFN',
    buyRate: 88.5, // صرافی دلار می‌خرد به قیمت ۸۸.۵ افغانی
    sellRate: 90.2, // صرافی دلار می‌فروشد به قیمت ۹۰.۲ افغانی
    unit: 'afn',
    validHours: 24,
    minAmount: 100,
    maxAmount: 50_000,
  },
  {
    exchangeId: 'exch_nobitex_001',
    currencyCode: 'EUR',
    currencyPair: 'EUR/AFN',
    buyRate: 96.1,
    sellRate: 98.0,
    unit: 'afn',
    validHours: 24,
  },
  {
    exchangeId: 'exch_nobitex_001',
    currencyCode: 'USD',
    currencyPair: 'USD/IRR',
    buyRate: 682_000, // ۶۸۲۰۰ تومان = ۶۸۲۰۰۰ ریال — ولی unit=toman پس ۶۸۲۰۰
    sellRate: 686_000,
    unit: 'toman',
    validHours: 24,
    minAmount: 50,
    maxAmount: 10_000,
  },

  // ── اکسیر ─────────────────────────────────────────────────────────────────
  {
    exchangeId: 'exch_exir_002',
    currencyCode: 'USD',
    currencyPair: 'USD/AFN',
    buyRate: 89.0,
    sellRate: 90.8,
    unit: 'afn',
    validHours: 24,
    minAmount: 50,
  },
  {
    exchangeId: 'exch_exir_002',
    currencyCode: 'AED',
    currencyPair: 'AED/AFN',
    buyRate: 24.1,
    sellRate: 24.7,
    unit: 'afn',
    validHours: 24,
  },
  {
    exchangeId: 'exch_exir_002',
    currencyCode: 'EUR',
    currencyPair: 'EUR/IRR',
    buyRate: 738_000,
    sellRate: 745_000,
    unit: 'toman',
    validHours: 24,
  },

  // ── بیت‌پین ────────────────────────────────────────────────────────────────
  {
    exchangeId: 'exch_bitpin_003',
    currencyCode: 'USD',
    currencyPair: 'USD/AFN',
    buyRate: 87.8,
    sellRate: 89.5,
    unit: 'afn',
    validHours: 24,
    minAmount: 200,
  },
  {
    exchangeId: 'exch_bitpin_003',
    currencyCode: 'USD',
    currencyPair: 'USD/IRR',
    buyRate: 680_000,
    sellRate: 685_500,
    unit: 'toman',
    validHours: 24,
    minAmount: 100,
  },

  // ── بیت ۲۴ ────────────────────────────────────────────────────────────────
  {
    exchangeId: 'exch_bit24_004',
    currencyCode: 'EUR',
    currencyPair: 'EUR/AFN',
    buyRate: 95.5,
    sellRate: 97.3,
    unit: 'afn',
    validHours: 24,
  },
  {
    exchangeId: 'exch_bit24_004',
    currencyCode: 'GBP',
    currencyPair: 'GBP/AFN',
    buyRate: 113.2,
    sellRate: 115.8,
    unit: 'afn',
    validHours: 24,
  },

  // ── صرافی سارا هرات ───────────────────────────────────────────────────────
  {
    exchangeId: 'exch_herat_sara_014',
    currencyCode: 'USD',
    currencyPair: 'USD/AFN',
    buyRate: 88.0,
    sellRate: 89.8,
    unit: 'afn',
    validHours: 24,
    minAmount: 500,
    maxAmount: 100_000,
  },
  {
    exchangeId: 'exch_herat_sara_014',
    currencyCode: 'EUR',
    currencyPair: 'EUR/AFN',
    buyRate: 95.0,
    sellRate: 97.0,
    unit: 'afn',
    validHours: 24,
    minAmount: 200,
  },
  {
    exchangeId: 'exch_herat_sara_014',
    currencyCode: 'AED',
    currencyPair: 'AED/AFN',
    buyRate: 23.9,
    sellRate: 24.5,
    unit: 'afn',
    validHours: 24,
  },

  // ── ابان تتر ───────────────────────────────────────────────────────────────
  {
    exchangeId: 'exch_abantether_009',
    currencyCode: 'USD',
    currencyPair: 'USD/IRR',
    buyRate: 681_000,
    sellRate: 686_000,
    unit: 'toman',
    validHours: 24,
    minAmount: 20,
    maxAmount: 5_000,
  },

  // ── والکس ─────────────────────────────────────────────────────────────────
  {
    exchangeId: 'exch_wallex_010',
    currencyCode: 'USD',
    currencyPair: 'USD/IRR',
    buyRate: 683_000,
    sellRate: 688_000,
    unit: 'toman',
    validHours: 24,
    minAmount: 50,
  },
  {
    exchangeId: 'exch_wallex_010',
    currencyCode: 'EUR',
    currencyPair: 'EUR/IRR',
    buyRate: 740_000,
    sellRate: 748_000,
    unit: 'toman',
    validHours: 24,
  },
];

// صرافی‌هایی که باید showInComparison=true باشند
const SHOW_IN_COMPARISON_IDS = [
  'exch_nobitex_001',
  'exch_exir_002',
  'exch_bitpin_003',
  'exch_bit24_004',
  'exch_herat_sara_014',
  'exch_abantether_009',
  'exch_wallex_010',
];

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  console.log('🌱 seed-exchange-quotes — شروع\n');

  // ── ۱. بررسی exchange های موجود ─────────────────────────────────────────
  console.log('1️⃣  بررسی exchange ها...');
  const existingExchanges = await p.exchange.findMany({
    where: { id: { in: SHOW_IN_COMPARISON_IDS } },
    select: { id: true, name: true, status: true, showInComparison: true },
  });

  const foundIds = new Set(existingExchanges.map((e) => e.id));
  const missingIds = SHOW_IN_COMPARISON_IDS.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    console.warn(`   ⚠️  این exchange ها در DB نیستند: ${missingIds.join(', ')}`);
    console.warn('   ابتدا npm run db:seed را اجرا کنید.');
  }

  for (const e of existingExchanges) {
    console.log(
      `   ${e.status === 'ACTIVE' ? '✅' : '⚠️'} ${e.name} | status=${e.status} | showInComparison=${e.showInComparison}`,
    );
  }

  // ── ۲. showInComparison=true برای exchange های کلیدی ────────────────────
  console.log('\n2️⃣  فعال‌سازی showInComparison...');
  const updateResult = await p.exchange.updateMany({
    where: {
      id: { in: SHOW_IN_COMPARISON_IDS },
      status: 'ACTIVE',
    },
    data: { showInComparison: true },
  });
  console.log(`   ✅ ${updateResult.count} exchange آپدیت شد`);

  // ── ۳. quote های ACTIVE منقضی را EXPIRED کن ─────────────────────────────
  console.log('\n3️⃣  منقضی کردن quote های قدیمی...');
  const expiredQuotes = await p.exchangeRateQuote.findMany({
    where: { status: 'ACTIVE', expiresAt: { lte: now } },
    select: { id: true },
  });
  if (expiredQuotes.length > 0) {
    await p.exchangeRateQuote.updateMany({
      where: { id: { in: expiredQuotes.map((q) => q.id) } },
      data: { status: 'EXPIRED' },
    });
    console.log(`   ✅ ${expiredQuotes.length} quote منقضی شد`);
  } else {
    console.log('   ℹ️  quote منقضی‌نشده‌ای برای cleanup نبود');
  }

  // ── ۴. ایجاد quote های جدید ─────────────────────────────────────────────
  console.log('\n4️⃣  ایجاد quote های جدید...');
  let created = 0;
  let skipped = 0;

  for (const q of SAMPLE_QUOTES) {
    // اگر exchange وجود نداره skip کن
    const exchange = await p.exchange.findUnique({
      where: { id: q.exchangeId },
      select: { id: true, name: true, status: true },
    });
    if (!exchange || exchange.status !== 'ACTIVE') {
      console.log(`   ⏭️  ${q.exchangeId} وجود ندارد یا غیرفعال است — skip`);
      skipped++;
      continue;
    }

    // اگر quote ACTIVE منقضی‌نشده برای همین exchange+currency وجود داره → skip
    const existing = await p.exchangeRateQuote.findFirst({
      where: {
        exchangeId: q.exchangeId,
        currencyCode: q.currencyCode,
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
    });
    if (existing) {
      console.log(
        `   ⏭️  ${exchange.name} / ${q.currencyCode} قبلاً active است (expires: ${existing.expiresAt?.toISOString()})`,
      );
      skipped++;
      continue;
    }

    // quote قدیمی PENDING را آرشیو کن
    await p.exchangeRateQuote.updateMany({
      where: { exchangeId: q.exchangeId, currencyCode: q.currencyCode, status: 'PENDING' },
      data: { status: 'ARCHIVED' },
    });

    const validMinutes = (q.validHours ?? 24) * 60;
    const expiresAt = new Date(now.getTime() + validMinutes * 60 * 1000);

    const newQuote = await p.exchangeRateQuote.create({
      data: {
        exchangeId: q.exchangeId,
        currencyCode: q.currencyCode,
        currencyPair: q.currencyPair,
        buyRate: q.buyRate,
        sellRate: q.sellRate,
        unit: q.unit,
        minAmount: q.minAmount ?? null,
        maxAmount: q.maxAmount ?? null,
        status: 'ACTIVE',
        validMinutes,
        expiresAt,
        approvedAt: now,
        approvedById: 'seed',
        note: 'seed-exchange-quotes — DEV',
      },
    });

    // QuoteStatusLog برای audit trail
    await p.quoteStatusLog.create({
      data: {
        quoteId: newQuote.id,
        toStatus: 'ACTIVE',
        actorRole: 'SYSTEM',
        reason: 'seeded by seed-exchange-quotes.js',
      },
    });

    console.log(
      `   ✅ ${exchange.name} / ${q.currencyCode} | buy=${q.buyRate} sell=${q.sellRate} ${q.unit} | expires: ${expiresAt.toLocaleString('fa-IR')}`,
    );
    created++;
  }

  // ── ۵. گزارش نهایی ──────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✨ نتیجه: ${created} quote ایجاد شد، ${skipped} skip شد\n`);

  const activeQuotes = await p.exchangeRateQuote.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: now } },
    include: { Exchange: { select: { name: true, showInComparison: true } } },
    orderBy: [{ currencyCode: 'asc' }, { buyRate: 'asc' }],
  });

  console.log(`📊 جمع quote های ACTIVE (منقضی‌نشده): ${activeQuotes.length}`);

  // group by currency
  const byCurrency = {};
  for (const aq of activeQuotes) {
    if (!byCurrency[aq.currencyCode]) byCurrency[aq.currencyCode] = [];
    byCurrency[aq.currencyCode].push(aq);
  }

  for (const [currency, qs] of Object.entries(byCurrency)) {
    console.log(`\n  ${currency} (${qs.length} صرافی):`);
    for (const aq of qs) {
      const showTag = aq.Exchange.showInComparison ? '🟢' : '🔴';
      console.log(
        `    ${showTag} ${aq.Exchange.name.padEnd(20)} buy=${aq.buyRate} sell=${aq.sellRate} ${aq.unit}`,
      );
    }
  }

  const quotesVisibleInBoard = activeQuotes.filter((q) => q.Exchange.showInComparison);
  console.log(`\n✅ در ExchangeQuotesBoard نمایش داده می‌شود: ${quotesVisibleInBoard.length} quote`);

  if (quotesVisibleInBoard.length === 0) {
    console.error('\n❌ خطا: هیچ quote‌ای قابل نمایش نیست!');
    console.error(
      '   دلیل احتمالی: exchange ها status=ACTIVE ندارند یا showInComparison=false است.',
    );
    process.exit(1);
  }

  console.log('\n🎉 seed موفق! صفحه money-transfer حالا داده دارد.');
  console.log('   لینک: http://localhost:3000/money-transfer\n');
}

main()
  .catch((e) => {
    console.error('\n❌ خطای کلی:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
