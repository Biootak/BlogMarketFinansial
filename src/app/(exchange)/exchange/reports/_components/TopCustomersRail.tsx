/**
 * TopCustomersRail — لیست فشرده از top 5 مشتری فعال.
 *
 * ساختار: avatar (initial) + name + progress bar از share. در hover، پس‌زمینه روشن می‌شود.
 * اگر داده نباشد، null برمی‌گرداند (مصرف‌کننده خودش شرط را چک می‌کند).
 */

import { Crown, UserCircle2 } from 'lucide-react';
import s from './TopCustomersRail.module.css';

export interface TopCustomer {
  id: string;
  name: string;
  dealCount: number;
  totalVolume: number;
  currency: string;
}

interface Props {
  customers: TopCustomer[];
}

const fmtCompact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);

export default function TopCustomersRail({ customers }: Props) {
  if (customers.length === 0) {
    return null;
  }

  const maxVol = Math.max(1, ...customers.map((c) => c.totalVolume));

  return (
    <section className={s.section} aria-label="مشتریان برتر">
      <header className={s.head}>
        <span className={s.eyebrow}>
          <Crown size={11} strokeWidth={1.75} aria-hidden />
          مشتریان برتر
        </span>
        <h2 className={s.title}>۵ مشتری فعال</h2>
      </header>

      <ul className={s.list}>
        {customers.slice(0, 5).map((c, i) => {
          const ratio = (c.totalVolume / maxVol) * 100;
          const initial = c.name.charAt(0).toUpperCase();
          return (
            <li
              key={c.id}
              className={s.row}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className={s.rank}>
                {new Intl.NumberFormat('fa-IR').format(i + 1)}
              </span>
              <span className={s.avatar} aria-hidden>
                {initial || <UserCircle2 size={12} />}
              </span>
              <div className={s.body}>
                <div className={s.bodyHead}>
                  <span className={s.name}>{c.name}</span>
                  <span className={s.volume}>
                    {fmtCompact(c.totalVolume)}{' '}
                    <em className={s.volumeCurrency}>{c.currency}</em>
                  </span>
                </div>
                <div className={s.barTrack} aria-hidden>
                  <span
                    className={s.barFill}
                    style={{ width: `${Math.max(2, ratio)}%` }}
                  />
                </div>
                <div className={s.bodyFoot}>
                  <span className={s.dealCount}>
                    {new Intl.NumberFormat('fa-IR').format(c.dealCount)} معامله
                  </span>
                  <span className={s.share}>
                    {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(ratio)}٪
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
