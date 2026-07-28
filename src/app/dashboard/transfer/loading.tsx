/**
 * /dashboard/transfer/loading — Skeleton برای loading state
 *
 * نمایش هم‌زمان با stream شدن TransferWizard.
 * ساختار آینه‌ای PageHeader + wizardCard + stepper برای جلوگیری از CLS.
 */
import s from './_components/TransferWizard.module.css';

export default function TransferLoading() {
  return (
    <div className={s.page} aria-busy="true" aria-live="polite">
      <div className={s.headerSkeleton}>
        <div className={s.skelEyebrow} />
        <div className={s.skelTitle} />
        <div className={s.skelDesc} />
      </div>
      <div className={s.wizardCard}>
        <div className={s.stepper} aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.stepItem}>
              {i > 0 && <div className={s.stepConnector} />}
              <div className={`${s.stepDot} ${s.stepDot_pending}`} />
              <span className={`${s.stepLabel} ${s.stepLabel_pending}`}>&nbsp;</span>
            </div>
          ))}
        </div>
        <div className={s.form} aria-hidden>
          <div className={s.skelFormTitle} />
          <div className={s.skelField} />
          <div className={s.skelField} />
        </div>
      </div>
    </div>
  );
}
