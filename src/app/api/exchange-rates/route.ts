import { NextResponse } from 'next/server';
import axios from 'axios';

const USDT_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'TONUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'XRPUSDT',
  'DOTUSDT',
  'UNIUSDT',
  'BCHUSDT',
  'LTCUSDT',
  'LINKUSDT',
  'XLMUSDT',
  'ETCUSDT',
  'THETAUSDT',
  'FILUSDT',
  'TRXUSDT',
  'USDT',
  'DASHUSDT',
  'NEOUSDT',
];

interface BinancePair {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

interface NobitexOrderbook {
  bids: [string, string][];
}

export async function GET() {
  try {
    const [cryptoResponse, usdtIrrResponse] = await Promise.all([
      axios.get<BinancePair[]>('https://api.binance.com/api/v3/ticker/24hr'),
      axios.get<NobitexOrderbook>('https://api.nobitex.ir/v2/orderbook/USDTIRT'),
    ]);

    const usdtIrrPrice = Number(usdtIrrResponse.data.bids[0][0]);

    const filteredRates = cryptoResponse.data
      .filter((pair: BinancePair) => USDT_PAIRS.includes(pair.symbol))
      .map((pair: BinancePair) => ({
        symbol: pair.symbol.replace('USDT', ''),
        rate: Number.parseFloat(pair.lastPrice),
        irrPrice: Math.round(Number.parseFloat(pair.lastPrice) * usdtIrrPrice),
        change: Number.parseFloat(pair.priceChangePercent),
      }));

    // اضافه کردن USDT به filteredRates
    const usdtData = {
      symbol: 'USDT',
      rate: 1,
      irrPrice: Math.round(usdtIrrPrice),
      change: 0,
    };

    const sortedRates = [
      ...filteredRates.filter((item) => item.symbol === 'BTC'),
      ...filteredRates.filter((item) => item.symbol === 'ETH'),
      ...filteredRates.filter((item) => item.symbol === 'TON'),
      usdtData,
      ...filteredRates.filter((item) => !['BTC', 'ETH'].includes(item.symbol)),
    ];

    return NextResponse.json({
      success: true,
      data: sortedRates,
      usdtIrrPrice,
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json({ error: 'خطا در دریافت نرخ‌های ارز' }, { status: 500 });
  }
}
