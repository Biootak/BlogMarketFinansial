import type { Metadata } from 'next';
import { AlertTriangle, Layers3, Siren } from 'lucide-react';

import { ErrorLedger } from '../_components/ErrorLedger';
import { IncidentTimeline } from '../_components/IncidentTimeline';
import { LevelDistribution } from '../_components/LevelDistribution';
import { ObsSection } from '../_components/ObsSection';
import b from '../_components/boards.module.css';

export const metadata: Metadata = { title: 'خطاها · مشاهده‌پذیری' };

/**
 * خطاها.
 * برخلاف بقیهٔ تب‌ها، اینجا زمینه **قبل** از فهرست می‌آید: تا ندانی فشار در
 * کدام ساعت متمرکز شده، خواندن دویست ردیف خطا فقط اضطراب می‌سازد.
 */
export default function ObservabilityErrorsPage() {
  return (
    <div className={b.tab} data-tab="errors">
      <header className={b.intro}>
        <div>
          <span className={b.eyebrow}>OPERATIONS / ERRORS</span>
          <h2 className={b.title}>خطاها را از نویز جدا کن</h2>
          <p className={b.lead}>
            رکوردهای هم‌شکل روی سرور گروه شده‌اند، پس یک خطای تکرارشونده صد ردیف نمی‌سازد و صد
            خطای متفاوت هم پشت یک ردیف پنهان نمی‌شود.
          </p>
        </div>
        <p className={b.stamp} data-tone="bad">
          <strong>صف بررسی</strong>
          <span>اولویت با شدت، بعد تازگی، بعد تکرار</span>
        </p>
      </header>

      <div className={b.board}>
        <ObsSection
          className={b.span7}
          icon={Siren}
          title="پنجره‌های بحرانی"
          hint="روی هر بازه بزن تا مکان‌نمای ساعت روی اوج همان بازه برود."
          tone="bad"
        >
          <IncidentTimeline />
        </ObsSection>

        <ObsSection
          className={`${b.span5} ${b.recessed}`}
          icon={Layers3}
          title="توزیع سطوح"
          hint="نسبت هشدار به خطا می‌گوید سامانه دارد شکایت می‌کند یا واقعاً می‌افتد."
        >
          <LevelDistribution />
        </ObsSection>

        <ObsSection
          className={`${b.span12} ${b.featured} ${b.alert}`}
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
