'use client';

/**
 * ExchangePublicView — orchestrator for /exchanges/[slug] main page.
 *
 *   ترکیب:
 *     • HeroIdentity   (dark, asymmetric 7/5)
 *     • LiveRatesBoard (filterable/sortable rate grid)
 *     • OnlineServices (بخش خدمات آنلاین — کارت‌های قابل کلیک)
 *     • WorkingHoursStrip (7-day schedule)
 *     • TrustSection   (about / contact / safety)
 *   از anchor scroll استفاده می‌کند؛ SubNav در layout هماهنگ می‌شود.
 */

import HeroIdentity from './HeroIdentity';
import LiveRatesBoard from './LiveRatesBoard';
import s from './ExchangePublicView.module.css';
import OnlineServices from './OnlineServices';
import TrustSection from './TrustSection';
import WorkingHoursStrip from './WorkingHoursStrip';
import type { PublicExchangeService } from '@/actions/exchange-services';

type ExchangeDTO = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  logoUrl: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  licenseNo: string | null;
  status: string;
  createdAt: Date;
  _count: { Customer: number; Transaction: number };
};

type RateDTO = {
  currencyCode: string;
  currencyPair: string;
  buyRate: string;
  sellRate: string;
  unit: string;
  spread: number;
  spreadPct: number;
  spark: number[];
  createdAt: Date;
};

type HoursMap = Record<string, { open: string; close: string; closed: boolean }>;

type Props = {
  exchange: ExchangeDTO;
  rates: RateDTO[];
  hours: HoursMap;
  primaryRate: RateDTO | null;
  services: PublicExchangeService[];
};

export default function ExchangePublicView({ exchange, rates, hours, primaryRate, services }: Props) {
  const activeCurrencies = rates.length;
  return (
    <article className={s.page} dir="rtl">
      <HeroIdentity
        exchange={{
          name: exchange.name,
          displayName: exchange.displayName,
          logoUrl: exchange.logoUrl,
          city: exchange.city,
          licenseNo: exchange.licenseNo,
          website: exchange.website,
          createdAt: exchange.createdAt,
          _count: exchange._count,
        }}
        primaryRate={primaryRate}
        activeCurrencies={activeCurrencies}
      />

      <LiveRatesBoard rates={rates} />

      <OnlineServices
        exchange={{
          id: exchange.id,
          slug: exchange.slug,
          name: exchange.name,
          displayName: exchange.displayName,
        }}
        services={services}
      />

      {Object.keys(hours).length > 0 && <WorkingHoursStrip hours={hours} />}

      <TrustSection
        exchange={{
          name: exchange.name,
          displayName: exchange.displayName,
          address: exchange.address,
          phone: exchange.phone,
          email: exchange.email,
          website: exchange.website,
          licenseNo: exchange.licenseNo,
          city: exchange.city,
          createdAt: exchange.createdAt,
        }}
      />
    </article>
  );
}
