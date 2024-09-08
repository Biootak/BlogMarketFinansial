'use server';

import prisma from '@/lib/db';

// تعریف interface برای currency
interface Currency {
  symbol: string;
  rate: number;
}

async function fetchNobitexRates() {
  console.log('شروع دریافت نرخ‌ها از Nobitex');
  const response = await fetch('https://api.nobitex.ir/v2/orderbook/all');
  const data = await response.json();
  console.log('داده‌های دریافتی از Nobitex:', JSON.stringify(data, null, 2));
  return data;
}

export async function updateExchangeRates() {
  try {
    console.log('شروع به‌روزرسانی نرخ‌های ارز');
    const nobitexData = await fetchNobitexRates();

    const usdtIrr = Number.parseFloat(nobitexData.USDTIRT.lastTradePrice);
    console.log(`نرخ USDT به IRR: ${usdtIrr}`);

    const currencies: Currency[] = Object.keys(nobitexData)
      .filter((key) => key.endsWith('IRT') || key.endsWith('USDT'))
      .map((key) => {
        const symbol = key.replace('IRT', '').replace('USDT', '');
        const rate = key.endsWith('IRT')
          ? Number.parseFloat(nobitexData[key].lastTradePrice)
          : Number.parseFloat(nobitexData[key].lastTradePrice) * usdtIrr;
        return { symbol, rate };
      });

    // حذف تکرارها و انتخاب آخرین نرخ برای هر ارز
    const uniqueCurrencies = Object.values(
      currencies.reduce((acc: { [key: string]: Currency }, curr) => {
        acc[curr.symbol] = curr;
        return acc;
      }, {}),
    );

    const top20Currencies = uniqueCurrencies
      .filter((c) => c.symbol) // حذف ارز با نماد خالی
      .slice(0, 20);

    console.log(`تعداد ارزهای منحصر به فرد: ${top20Currencies.length}`);
    console.log('ارزهای فیلتر شده:', JSON.stringify(top20Currencies, null, 2));

    for (const currency of top20Currencies) {
      console.log(`پردازش ارز: ${currency.symbol}`);
      const prevRate = await prisma.exchangeRate.findUnique({
        where: { symbol: currency.symbol },
        select: { rate: true },
      });

      console.log(`نرخ قبلی برای ${currency.symbol}: ${prevRate ? prevRate.rate : 'موجود نیست'}`);

      const change = prevRate ? ((currency.rate - prevRate.rate) / prevRate.rate) * 100 : 0;

      if (!Number.isNaN(currency.rate)) {
        console.log(`به‌روزرسانی/ایجاد رکورد برای ${currency.symbol}`);
        const result = await prisma.exchangeRate.upsert({
          where: { symbol: currency.symbol },
          update: { rate: currency.rate, change: change },
          create: {
            symbol: currency.symbol,
            name: currency.symbol, // یا می‌توانید نام کامل ارز را اینجا قرار دهید
            rate: currency.rate,
            change: change,
          },
        });

        console.log(`نتیجه عملیات برای ${currency.symbol}:`, JSON.stringify(result, null, 2));
      } else {
        console.log(`نرخ نامعتبر برای ${currency.symbol}, از به‌روزرسانی صرف نظر شد.`);
      }
    }

    console.log('به‌روزرسانی نرخ‌های ارز با موفقیت انجام شد');
  } catch (error) {
    console.error('خطا در به‌روزرسانی نرخ‌های ارز:', error);
  }
}
