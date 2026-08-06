import s from './_components/obs.module.css';

/** اسکلت بارگذاری — هم‌ریتم با چیدمان واقعی صفحه، نه اسپینر. */
export default function ObservabilityLoading() {
  return (
    <div className={s.skeleton} aria-busy="true" aria-live="polite">
      <span className="sr-only">در حال خواندن آخرین وضعیت سامانه</span>
      <div className={s.skelBar} />
      <div className={s.skelHero} />
      <div className={s.skelRows}>
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
      </div>
    </div>
  );
}
