'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateExchangeRates(data: any) {
  const services = Object.keys(data);

  for (const service of services) {
    const { buy, sell } = data[service];
    await prisma.exchangeRate.upsert({
      where: { service_currency: { service, currency: 'USD' } },
      update: {
        buyRate: Number.parseFloat(buy),
        sellRate: Number.parseFloat(sell),
      },
      create: {
        service,
        currency: 'USD',
        buyRate: Number.parseFloat(buy),
        sellRate: Number.parseFloat(sell),
      },
    });
  }

  revalidatePath('/services/money-transfer');
}
