'use client';

import { PageHeader, Section, StatCard, StatGrid } from '@/components/Dashboard/primitives';
import { Bitcoin, Coins, RefreshCw, TrendingUp, Wallet, ArrowRightLeft, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';

export default function CryptoPortalClient() {
  const [marketData, setMarketData] = useState([
    { name: 'Bitcoin', symbol: 'BTC', price: 65432.10, change: '+2.4%' },
    { name: 'Ethereum', symbol: 'ETH', price: 3210.45, change: '-1.2%' },
    { name: 'Tether', symbol: 'USDT', price: 1.00, change: '0.0%' },
    { name: 'Solana', symbol: 'SOL', price: 145.67, change: '+5.7%' },
  ]);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => prev.map(coin => ({
        ...coin,
        price: coin.price * (1 + (Math.random() * 0.002 - 0.001))
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="تبادل ارز دیجیتال"
        description="خرید، فروش و تبدیل دارایی‌های دیجیتال"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'ارز دیجیتال' }]}
        icon="arrow-left-right"
      />

      <StatGrid cols={3}>
        <StatCard 
          label="موجودی بیت‌کوین" 
          value={0} 
          icon={<Bitcoin className="size-4" />} 
          format="persian" 
          info="Bitcoin (BTC)"
        />
        <StatCard 
          label="موجودی تتر (USDT)" 
          value={0} 
          icon={<Coins className="size-4" />} 
          format="persian"
          info="Tether (USDT)"
        />
        <StatCard 
          label="معادل دلاری کل" 
          value={0} 
          icon={<Wallet className="size-4" />} 
          format="latin"
          info="Total USD Balance"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="خرید و فروش سریع" icon={<RefreshCw className="size-5" />} className="h-full">
          <div className="rounded-2xl bg-muted/30 p-6 backdrop-blur-sm border border-border/50">
            <div className="flex flex-col gap-4">
              <div className="group space-y-2">
                <label className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-primary">پرداخت می‌کنم</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4" 
                      placeholder="0.00" 
                      type="number"
                    />
                  </div>
                  <select className="rounded-xl border border-border bg-background px-3 font-medium outline-none transition-colors hover:bg-muted/50">
                    <option>USD</option>
                    <option>AFN</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5 transition-transform hover:rotate-180">
                  <ArrowRightLeft size={18} />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-primary">دریافت می‌کنم</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4" 
                      placeholder="0.00" 
                      type="number"
                      readOnly
                    />
                  </div>
                  <select className="rounded-xl border border-border bg-background px-3 font-medium outline-none transition-colors hover:bg-muted/50">
                    <option>BTC</option>
                    <option>USDT</option>
                    <option>ETH</option>
                  </select>
                </div>
              </div>

              <button className="mt-4 w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                تایید و معامله آنی
              </button>
            </div>
          </div>
        </Section>

        <Section title="وضعیت بازار" icon={TrendingUp} className="h-full">
          <div className="flex flex-col divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {marketData.map((coin) => (
                <motion.div 
                  layout
                  key={coin.symbol} 
                  className="flex items-center justify-between py-4 transition-colors hover:bg-muted/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                      {coin.symbol === 'BTC' ? <Bitcoin className="text-orange-500" size={20} /> : <Coins className="text-primary" size={20} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{coin.name}</div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase">{coin.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold">
                      ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(coin.price)}
                    </div>
                    <div className={`text-[10px] font-bold ${coin.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {coin.change}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Section>
      </div>
    </motion.div>
  );
}
