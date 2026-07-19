/**
 * TransferRequestCTA — 2026 Grade Section Wrapper
 * Two-panel layout: trust/info column + form card
 * Signature: ambient gradient ring + animated stats
 */
import { getSupportContactLinks } from '@/actions/serviceRequestActions';
import s from './TransferRequestCTA.module.css';
import TransferRequestForm from './TransferRequestForm';

const TRUST_STATS = [
  { value: '۲,۵۰۰+', label: 'تراکنش ماهانه', detail: 'موفق در خدمات ارزی' },
  { value: '۹۸٪', label: 'رضایت مشتریان', detail: 'بر اساس نظرسنجی' },
  { value: '۳۰ دقیقه', label: 'زمان پاسخ', detail: 'حداکثر در ساعات کاری' },
  { value: '۱۲,۰۰۰+', label: 'مشتری فعال', detail: 'از سرتاسر جهان' },
];

const FEATURES = [
  { title: 'نرخ لحظه‌ای', body: 'نرخ‌های ما هر ۱۵ دقیقه بروز می‌شوند.' },
  { title: 'بدون هزینه پنهان', body: 'تمام کارمزدها پیش از پرداخت اعلام می‌شود.' },
  { title: 'پشتیبانی ۷/۲۴', body: 'تیم ما از طریق تلگرام و واتساپ همیشه در دسترس است.' },
];

export default async function TransferRequestCTA() {
  const contactLinks = await getSupportContactLinks();

  return (
    <section className={s.section} id="contact" aria-labelledby="transfer-cta-title">
      {/* ── Ambient background glows — clipped inside their own layer so the
           section itself stays overflow:visible, letting dropdowns escape ── */}
      <div className={s.glowLayer} aria-hidden="true">
        <div className={s.glowA} />
        <div className={s.glowB} />
      </div>

      <div className={s.inner}>
        {/* ── Info column ──────────────────────────────────────────── */}
        <div className={s.infoCol}>
          {/* Eyebrow */}
          <p className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden="true" />
            ثبت آنلاین درخواست
          </p>

          <h2 className={s.title} id="transfer-cta-title">
            خدمات ارزی خود را
            <span className={s.titleAccent}> آنلاین </span>
            ثبت کنید
          </h2>

          <p className={s.subtitle}>
            حواله، خرید و فروش ارز، ارز دیجیتال، پی‌پال و بیشتر — بدون مراجعه حضوری. کارشناسان ما در
            کمتر از ۳۰ دقیقه با شما تماس می‌گیرند.
          </p>

          {/* Stats grid */}
          <ul className={s.statsGrid} aria-label="آمار خدمات">
            {TRUST_STATS.map(({ value, label, detail }) => (
              <li key={label} className={s.statCard}>
                <span className={s.statValue}>{value}</span>
                <span className={s.statLabel}>{label}</span>
                <span className={s.statDetail}>{detail}</span>
              </li>
            ))}
          </ul>

          {/* Feature bullets */}
          <ul className={s.features}>
            {FEATURES.map(({ title, body }) => (
              <li key={title} className={s.feature}>
                <span className={s.featureDot} aria-hidden="true" />
                <span>
                  <strong className={s.featureTitle}>{title}</strong> {body}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Form card ─────────────────────────────────────────────── */}
        <div className={s.formCol}>
          {/* Gradient ring border — signature WOW moment */}
          <div className={s.formCard}>
            <div className={s.formCardInner}>
              <div className={s.formHeader}>
                <h3 className={s.formTitle}>ثبت درخواست</h3>
                <p className={s.formSub}>سرویس مورد نظر را انتخاب کنید — فقط ۲ دقیقه طول می‌کشد</p>
              </div>

              <TransferRequestForm
                telegramLink={contactLinks.telegram ?? null}
                whatsappLink={contactLinks.whatsapp ?? null}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
