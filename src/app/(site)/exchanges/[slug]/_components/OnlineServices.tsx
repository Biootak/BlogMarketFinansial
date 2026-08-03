'use client';

/**
 * OnlineServices — بخش خدمات آنلاین صرافی در صفحه عمومی.
 *
 *  لایه ۲ از ۴ لایه‌ای که در research پیشنهاد شد:
 *  - روی `/exchanges/[slug]` بین LiveRatesBoard و WorkingHoursStrip قرار می‌گیرد
 *  - grid از کارت‌ها — هر کارت: icon + name + description + CTA
 *  - کلیک روی کارت → مودال درخواست (ExchangeServiceRequestDialog)
 *  - اگر صراف ctaHref ست کرده باشد، کارت لینک خارجی می‌شود (پنجره جدید)
 *  - empty state: صرافی هنوز سرویسی فعال نکرده
 *  - signature moment: counter «X سرویس فعال» بالای grid
 *
 *  UX pattern: Binance-style service cards + Modal برای ثبت
 *  RTL-safe, token-only, scroll-reveal با IntersectionObserver
 */

import { type PublicExchangeService, logServiceClick } from '@/actions/exchange-services';
import { getServiceMeta } from '@/lib/exchange-services';
import { ArrowLeft, Clock4, ExternalLink, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ExchangeServiceRequestDialog from './ExchangeServiceRequestDialog';
import s from './OnlineServices.module.css';

type Props = {
  exchange: {
    id: string;
    slug: string;
    name: string;
    displayName: string | null;
  };
  services: PublicExchangeService[];
};

export default function OnlineServices({ exchange, services }: Props) {
  const [activeService, setActiveService] = useState<PublicExchangeService | null>(null);
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Reveal animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '-10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /**
   * Fire-and-forget analytics — وقتی کاربر روی کارت سرویس کلیک می‌کند.
   * 2026-07-28: logServiceClick داخل خودش error handling دارد و شکست
   * آن نباید تجربه کاربر را مختل کند. catch نمی‌کنیم.
   */
  const trackClick = (service: PublicExchangeService) => {
    void logServiceClick({
      serviceKey: service.serviceKey,
      exchangeId: exchange.id,
      source: 'profile',
      referer: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  };

  // اگر سرویسی نیست، section را مخفی کن — می‌توان بعداً با "افزودن خدمات" جایگزین شد
  if (services.length === 0) {
    return (
      <section
        ref={sectionRef}
        id="services"
        className={s.root}
        dir="rtl"
        aria-labelledby="online-services-title"
      >
        <div className={s.container}>
          <div className={s.emptyState}>
            <div className={s.emptyIcon} aria-hidden>
              <Sparkles size={20} strokeWidth={1.8} />
            </div>
            <h2 id="online-services-title" className={s.emptyTitle}>
              خدمات آنلاین
            </h2>
            <p className={s.emptyText}>
              {exchange.name} هنوز خدمات آنلاینی را در پلتفرم ثبت نکرده است.
            </p>
            <p className={s.emptyHint}>
              برای اطلاع از خدمات این صرافی، از طریق صفحه تماس با آن‌ها ارتباط بگیرید.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const activeCount = services.length;

  return (
    <>
      <section
        ref={sectionRef}
        id="services"
        className={`${s.root} ${revealed ? s.rootRevealed : ''}`}
        dir="rtl"
        aria-labelledby="online-services-title"
      >
        <div className={s.container}>
          {/* Header */}
          <header className={s.header}>
            <span className={s.eyebrow}>
              <Wallet size={12} strokeWidth={1.9} aria-hidden />
              <span>خدمات آنلاین</span>
            </span>
            <h2 id="online-services-title" className={s.title}>
              {exchange.name} چه خدماتی آنلاین ارائه می‌دهد؟
            </h2>
            <p className={s.sub}>
              {activeCount.toLocaleString('fa-IR')} سرویس فعال — کلیک کنید تا درخواست خود را ثبت
              کنید.
            </p>
          </header>

          {/* Grid */}
          <ul className={s.grid}>
            {services.map((service, idx) => {
              const meta = getServiceMeta(service.serviceKey);
              if (!meta) return null;
              const Icon = meta.icon;
              const isExternal = !!service.ctaHref;
              return (
                <li
                  key={service.serviceKey}
                  className={`${s.card} ${s[`accent_${meta.accent}`] ?? ''}`}
                  style={{ ['--card-reveal-delay' as string]: `${idx * 60}ms` }}
                >
                  <div className={s.cardInner}>
                    <div className={s.iconWrap} aria-hidden>
                      <Icon size={22} strokeWidth={1.8} />
                    </div>
                    <h3 className={s.cardTitle}>{service.name}</h3>
                    <p className={s.cardBody}>{service.description}</p>
                    {service.leadTimeMin != null && service.leadTimeMin > 0 && (
                      <div className={s.leadTime} title="زمان تقریبی پاسخ‌گویی">
                        <Clock4 size={12} strokeWidth={1.9} aria-hidden />
                        <span>پاسخ‌گویی: {formatLeadTime(service.leadTimeMin)}</span>
                      </div>
                    )}
                    <div className={s.cardFooter}>
                      {isExternal ? (
                        <a
                          href={service.ctaHref ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.cardCta}
                          onClick={() => trackClick(service)}
                        >
                          <span>مشاهده در سایت صرافی</span>
                          <ExternalLink size={14} strokeWidth={2} aria-hidden />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className={s.cardCta}
                          onClick={() => {
                            trackClick(service);
                            setActiveService(service);
                          }}
                        >
                          <span>ثبت درخواست</span>
                          <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                  <span className={s.cardLine} aria-hidden />
                </li>
              );
            })}
          </ul>

          {/* Trust strip */}
          <div className={s.trustStrip} role="note">
            <span className={s.trustDot} aria-hidden />
            <span>
              پس از ثبت درخواست، کد پیگیری دریافت می‌کنید. صرافی از طریق روش تماس انتخابی شما پاسخ
              می‌دهد.
            </span>
          </div>
        </div>
      </section>

      {/* Dialog — فقط وقتی کارت کلیک شده باشد */}
      {activeService && (
        <ExchangeServiceRequestDialog
          open={Boolean(activeService)}
          onOpenChange={(o) => {
            if (!o) setActiveService(null);
          }}
          exchange={exchange}
          service={activeService}
        />
      )}
    </>
  );
}

/** 2026-07-28: format SLA — دقیقه → متن فارسی قابل خواندن */
function formatLeadTime(min: number): string {
  if (min < 60) return `${new Intl.NumberFormat('fa-IR').format(min)} دقیقه`;
  if (min < 60 * 24) {
    const hours = Math.floor(min / 60);
    return `${new Intl.NumberFormat('fa-IR').format(hours)} ساعت`;
  }
  const days = Math.floor(min / (60 * 24));
  return `${new Intl.NumberFormat('fa-IR').format(days)} روز`;
}
