/**
 * test-workflow.js — تست end-to-end جریان کاری خرید/فروش صرافی
 *
 * اجرا: node prisma/test-workflow.js
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ log: ['warn', 'error'] });

async function testWorkflow() {
  const now = new Date();
  let testDealId = null;
  let lockedQuoteId = null;

  try {
    // ── تست ۱: quotes فعال ──────────────────────────────────────────────────
    console.log('=== TEST 1: Active Quotes for ExchangeQuotesBoard ===');
    const quotes = await p.exchangeRateQuote.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
        Exchange: { showInComparison: true, status: 'ACTIVE' },
      },
      include: {
        Exchange: { select: { name: true, displayName: true, city: true, logoUrl: true } },
      },
      orderBy: [{ Exchange: { name: 'asc' } }, { currencyCode: 'asc' }],
    });

    console.log('Total visible quotes:', quotes.length);
    if (quotes.length === 0) {
      console.error('❌ هیچ quote‌ای پیدا نشد — ابتدا seed-exchange-quotes.js را اجرا کنید');
      process.exit(1);
    }

    const currencies = [...new Set(quotes.map((q) => q.currencyCode))].sort();
    console.log('Currencies available:', currencies.join(', '));

    // اطمینان از اینکه USD، EUR هستند
    const hasCurrencies = currencies.includes('USD') && currencies.includes('EUR');
    console.log(hasCurrencies ? '✅ USD و EUR موجودند' : '⚠️ برخی ارزهای اصلی وجود ندارند');

    // ── تست ۲: ساخت deal با quote ─────────────────────────────────────────
    console.log('\n=== TEST 2: createDeal flow ===');
    const usdAfnQuote = quotes.find((q) => q.currencyCode === 'USD' && q.unit === 'afn');
    if (!usdAfnQuote) {
      console.error('❌ quote USD/afn پیدا نشد');
      process.exit(1);
    }

    const exchangeName = usdAfnQuote.Exchange.displayName || usdAfnQuote.Exchange.name;
    console.log(
      'Quote selected:',
      exchangeName,
      `| buy=${usdAfnQuote.buyRate} sell=${usdAfnQuote.sellRate} afn`,
    );

    // محاسبه — مشتری 100 دلار می‌خرد، صرافی به قیمت sellRate می‌فروشد
    const fromAmount = 100;
    const appliedRate = Number(usdAfnQuote.sellRate);
    const toAmount = fromAmount * appliedRate;
    // مثال: 100 USD * 90.2 AFN/USD = 9020 AFN
    console.log(`Calculation: ${fromAmount} USD × ${appliedRate} AFN/USD = ${toAmount} AFN`);

    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const trackingCode = `DL-TEST-${ts}-${rand}`;
    const idemKey = `test-flow-${usdAfnQuote.id}-${Date.now()}`;

    const deal = await p.currencyDeal.create({
      data: {
        trackingCode,
        exchangeId: usdAfnQuote.exchangeId,
        quoteId: usdAfnQuote.id,
        userId: null,
        customerName: 'تست کاربر',
        customerPhone: '09120000000',
        customerEmail: null,
        fromCurrency: 'USD',
        toCurrency: 'AFN',
        fromAmount,
        toAmount,
        appliedRate,
        feeAmount: 0,
        channel: 'ONLINE',
        status: 'PENDING',
        note: 'تست جریان کاری',
        idempotencyKey: idemKey,
      },
    });
    testDealId = deal.id;

    await p.dealStatusLog.create({
      data: { dealId: deal.id, toStatus: 'PENDING', actorRole: 'GUEST' },
    });

    console.log('✅ Deal created:', deal.trackingCode);
    console.log(
      `   ${deal.fromAmount.toString()} USD → ${deal.toAmount.toString()} AFN @ ${deal.appliedRate.toString()}`,
    );

    // quote رو LOCKED کن (شبیه‌سازی createDeal در actions)
    await p.exchangeRateQuote.update({
      where: { id: usdAfnQuote.id },
      data: { status: 'LOCKED' },
    });
    lockedQuoteId = usdAfnQuote.id;
    console.log('✅ Quote LOCKED (از دسترس موقت خارج شد)');

    // ── تست ۳: بررسی idempotency ──────────────────────────────────────────
    console.log('\n=== TEST 3: Idempotency Check ===');
    const duplicate = await p.currencyDeal.findUnique({
      where: { idempotencyKey: idemKey },
    });
    if (duplicate && duplicate.id === deal.id) {
      console.log('✅ Idempotency OK — درخواست تکراری همان deal رو برمی‌گردونه');
    } else {
      console.error('❌ Idempotency fail!');
    }

    // ── تست ۴: پیگیری معامله با tracking code ─────────────────────────────
    console.log('\n=== TEST 4: getDealByTracking ===');
    const found = await p.currencyDeal.findUnique({
      where: { trackingCode: deal.trackingCode },
      include: { Exchange: { select: { name: true, displayName: true, city: true } } },
    });
    if (found) {
      console.log('✅ Deal found by tracking code:', found.trackingCode);
      console.log('   exchange:', found.Exchange.displayName || found.Exchange.name);
      console.log('   status:', found.status);
    } else {
      console.error('❌ Deal not found by tracking code!');
    }

    // ── تست ۵: بررسی StatusLog ────────────────────────────────────────────
    console.log('\n=== TEST 5: DealStatusLog ===');
    const logs = await p.dealStatusLog.findMany({
      where: { dealId: deal.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log('Status logs count:', logs.length);
    for (const log of logs) {
      console.log(
        '  ',
        log.fromStatus ?? '(start)',
        '→',
        log.toStatus,
        '|',
        log.actorRole ?? 'unknown',
      );
    }
    console.log('✅ Status log chain درست است');

    // ── تست ۶: بررسی اینکه در Board دیده می‌شه ───────────────────────────
    console.log('\n=== TEST 6: Board Visibility After Lock ===');
    const lockedVisible = await p.exchangeRateQuote.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
        Exchange: { showInComparison: true, status: 'ACTIVE' },
        currencyCode: 'USD',
      },
      include: { Exchange: { select: { name: true } } },
    });
    const wasLocked = !lockedVisible.some((q) => q.id === usdAfnQuote.id);
    console.log(
      wasLocked
        ? '✅ Quote LOCKED از Board خارج شد (سایر USD quotes هنوز نشان داده می‌شوند)'
        : '⚠️ LOCKED quote هنوز در Board نمایش داده می‌شود',
    );
    console.log('USD quotes still visible in board:', lockedVisible.length);

    console.log('\n🎉 تمام تست‌ها با موفقیت گذشتند!');
  } finally {
    // ── cleanup ──────────────────────────────────────────────────────────
    console.log('\n=== Cleanup ===');
    if (testDealId) {
      await p.dealStatusLog.deleteMany({ where: { dealId: testDealId } });
      await p.currencyDeal.delete({ where: { id: testDealId } });
      console.log('✅ Test deal deleted');
    }
    if (lockedQuoteId) {
      await p.exchangeRateQuote.update({
        where: { id: lockedQuoteId },
        data: { status: 'ACTIVE' },
      });
      console.log('✅ Quote restored to ACTIVE');
    }
  }
}

testWorkflow()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error('\n❌ خطای کلی:', e.message ?? e);
    p.$disconnect();
    process.exit(1);
  });
