// Quick DB probe to inspect rate-list data shape
const prisma = require('./src/lib/db').default;
(async () => {
  try {
    const lists = await prisma.rateList.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    console.log('total rateLists:', lists.length);
    let withPipe = 0;
    let withoutPipe = 0;
    let sampleWithPipe = null;
    let sampleWithoutPipe = null;
    for (const l of lists) {
      const rates = Array.isArray(l.rates) ? l.rates : [];
      for (const r of rates) {
        const v = String(r?.value || '');
        if (v.includes('|')) {
          withPipe++;
          if (!sampleWithPipe) sampleWithPipe = { listTitle: l.title, rate: r };
        } else {
          withoutPipe++;
          if (!sampleWithoutPipe) sampleWithoutPipe = { listTitle: l.title, rate: r };
        }
      }
    }
    console.log('with | (buy/sell):', withPipe);
    console.log('without | (single):', withoutPipe);
    console.log('sample with | :', JSON.stringify(sampleWithPipe, null, 2));
    console.log('sample without | :', JSON.stringify(sampleWithoutPipe, null, 2));
    console.log('all titles with sample rate values:');
    for (const l of lists) {
      const rates = Array.isArray(l.rates) ? l.rates : [];
      console.log(' -', l.title, `(active=${l.isActive})`, 'rates:', rates.length);
      for (const r of rates.slice(0, 3)) {
        console.log('     •', r.title, '=>', String(r.value).slice(0, 80));
      }
    }
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
