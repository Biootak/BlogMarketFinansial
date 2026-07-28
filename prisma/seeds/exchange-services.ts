/**
 * 2026-07-28: Seed نمونه برای ExchangeService — استفاده در development / staging.
 *
 * Usage:  npx tsx prisma/seeds/exchange-services.ts
 *   (یا import از یک prisma seed script کلی)
 *
 * Logic:
 *   - همه صرافی‌های ACTIVE را می‌گیرد
 *   - برای هر کدام ۵ سرویس random فعال می‌کند (شامل همه ۱۰ گروه پوشش)
 *   - idempotent: اگر رکوردی موجود است، update می‌کند
 *
 * ⚠️ فقط برای development. در production صرافی‌ها خودشان از داشبورد انتخاب می‌کنند.
 */

import prisma from '../../src/lib/db';
import { EXCHANGE_SERVICE_CATALOG } from '../../src/lib/exchange-services';

async function main() {
  const exchanges = await prisma.exchange.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
  });

  if (exchanges.length === 0) {
    console.log('هیچ صرافی ACTIVE پیدا نشد — ابتدا صرافی seed کنید.');
    return;
  }

  let totalUpserted = 0;

  for (const ex of exchanges) {
    // ۵ سرویس تصادفی (شامل همه ۵ گروه)
    const servicesToEnable = [
      'CURRENCY_BUY', // currency
      'INTERNATIONAL_TRANSFER', // transfer
      'ONLINE_PAYMENT', // payment
      'CRYPTO_BUY', // crypto
      'GIFT_CARD', // specialty
    ];

    for (const key of servicesToEnable) {
      const meta = EXCHANGE_SERVICE_CATALOG.find((s: { key: string }) => s.key === key);
      if (!meta) continue;

      await prisma.exchangeService.upsert({
        where: { exchangeId_serviceKey: { exchangeId: ex.id, serviceKey: key } },
        create: {
          exchangeId: ex.id,
          serviceKey: key,
          isActive: true,
          order: meta.defaultOrder,
        },
        update: {
          isActive: true,
          order: meta.defaultOrder,
        },
      });
      totalUpserted += 1;
    }
  }

  console.log(`✓ ${exchanges.length} صرافی × ۵ سرویس = ${totalUpserted} رکورد`);
  console.log('  برای دیدن نتیجه: /exchanges/<slug>  و  /services');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
