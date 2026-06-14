import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  await p.headerAd.updateMany({ where: { isActive: true }, data: { isActive: false } });
  const ad = await p.headerAd.create({
    data: {
      text: 'پیشنهاد ویژه: ۲۰٪ تخفیف اشتراک ویژه',
      subtext: 'فقط تا پایان هفته',
      ctaLabel: 'بیشتر بدانید',
      ctaHref: '/subscription',
      variant: 'TEXT',
      theme: 'PRIMARY',
      isActive: true,
      priority: 10,
    },
  });
  console.log('Created:', ad);
}
main().finally(() => p.$disconnect());
