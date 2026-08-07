// Quick DB probe to inspect rate-list data shape (TS)
import prisma from '../src/lib/db';

(async () => {
  try {
    const lists = await prisma.rateList.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    console.log('total rateLists:', lists.length);
    let withPipe = 0;
    let withoutPipe = 0;
    let sampleWithPipe: any = null;
    let sampleWithoutPipe: any = null;
    for (const l of lists) {
      const rates = Array.isArray(l.rates) ? l.rates : [];
      for (const r of rates) {
        const v = String((r as any)?.value || '');
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
    console.log('---');
    for (const l of lists) {
      const rates = Array.isArray(l.rates) ? l.rates : [];
      console.log('LIST:', l.title, `| active=${l.isActive}`, `| rates=${rates.length}`);
      for (const r of rates) {
        const v = String((r as any)?.value || '').slice(0, 80);
        console.log('   •', (r as any).title, '=>', v);
      }
    }
  } catch (e: any) {
    console.error('ERR', e?.message);
  } finally {
    await prisma.$disconnect();
  }
})();
