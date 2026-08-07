import type { Metadata } from 'next';
import { AlertTriangle, Layers3, Siren } from 'lucide-react';

import { ErrorLedger } from '../_components/ErrorLedger';
import { IncidentTimeline } from '../_components/IncidentTimeline';
import { LevelDistribution } from '../_components/LevelDistribution';
import { ObsSection } from '../_components/ObsSection';
import b from '../_components/boards.module.css';

export const metadata: Metadata = {
  title: 'خطاها · مشاهده‌پذیری',
  description: 'دفتر خطای سامانه بر پایهٔ لاگ‌های واقعی، گروه‌بندی‌شده بر اساس پیام و شدت.',
};

/**
 * خطاها.
 *
 * برخلاف بقیهٔ تب‌ها، اینجا زمینه **قبل** از فهرست می‌آید: تا ندانی فشار در
 * کدام ساعت متمرکز شده، خواندن دویست ردیف خطا فقط اضطراب می‌سازد. پس اول
 * پنجره‌های بحرانی و توزیع سطوح، بعد دفتر خطا.
 */
export default function ObservabilityErrorsPage() {
  return (
    <div className={b.tabLayout} data-tab="errors">
      <header className={b.tabIntro}>
        <div>
          <span className={b.tabEyebrow}>OPERATIONS / ERRORS</span>
          <h2 className={b.tabTitle}>خطاها را از نویز جدا کن</h2>
          <p className={b.tabLead}>
            رکوردهای هم‌شکل روی سرور گروه شده‌اند، پس یک خطای تکرارشونده صد ردیف نمی‌سازد و صد
            خطای متفاوت هم پشت یک ردیف پنهان نمی‌شود.
          </p>
        </div>
        <p className={b.tabStamp} data-tone="bad">
          <strong>صف بررسی</strong>
          <span>اولویت با شدت، بعد تازگی، بعد تکرار</span>
        </p>
      </header>

      <div className={b.tabGrid}>
        <ObsSection
          className={b.seven}
          icon={Siren}
          title="پنجره‌های بحرانی"
          hint="روی هر بازه بزن تا مکان‌نمای ساعت روی اوج همان بازه برود."
          tone="bad"
        >
          <IncidentTimeline />
        </ObsSection>

        <ObsSection
          className={`${b.five} ${b.recessed}`}
          icon={Layers3}
          title="توزیع سطوح"
          hint="نسبت هشدار به خطا می‌گوید سامانه دارد شکایت می‌کند یا واقعاً می‌افتد."
        >
          <LevelDistribution />
        </ObsSection>

        <ObsSection
          className={`${b.wide} ${b.featured} ${b.alertSurface}`}
          icon={AlertTriangle}
          title="دفتر خطا"
          hint="هر ردیف را باز کن تا پیام کامل و شناسهٔ رکورد مرجع را ببینی."
          tone="bad"
        >
          <ErrorLedger />
        </ObsSection>
      </div>
    </div>
  );
}
