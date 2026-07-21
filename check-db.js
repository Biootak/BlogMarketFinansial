// check-db.js — debug helper, only used to inspect data
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rates = await p.exchangeRate.findMany({ orderBy: [{ priority: 'asc' }] });
  console.log('ExchangeRate count:', rates.length);
  rates.forEach((r) => {
    console.log(
      '  -',
      r.symbol ?? '∅',
      '|',
      r.name,
      '|',
      r.displayNameFa ?? '∅',
      '| buy:',
      r.buyRate ?? '∅',
      '| sell:',
      r.sellRate ?? '∅',
      '| rateType:',
      r.rateType,
      '| active:',
      r.active,
    );
  });

  const providers = await p.transferProvider.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  });
  console.log('\nTransferProvider count:', providers.length);
  providers.forEach((pp) => {
    console.log(
      '  -',
      pp.slug,
      '|',
      pp.name,
      '| kind:',
      pp.kind,
      '| spread:',
      pp.spreadPercent,
      '| fee:',
      pp.flatFeeToman,
      '| speed(min):',
      pp.speedMinutes,
    );
  });

  const rateLists = await p.rateList.findMany({ where: { isActive: true } });
  console.log('\nRateList count:', rateLists.length);

  await p.$disconnect();
})();
