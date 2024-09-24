import { cache } from 'react';
import prisma from '../db';

export const getExchangeRates = cache(async () => {
  return prisma.exchangeRate.findMany({
    orderBy: [{ service: 'asc' }, { currency: 'asc' }],
  });
});
