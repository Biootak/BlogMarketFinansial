import s from './_components/obs.module.css';

/**
 * اسکلت بارگذاری — هم‌ریتم با چیدمان واقعی صفحه، نه اسپینر.
 * ترتیب دقیقاً همان چیزی است که بعد از لود می‌آید: نوار فرمان، سرلوحهٔ حکم،
 * پارتیتور زمانی، بعد بلوک‌ها؛ پس هیچ پرشِ چیدمانی رخ نمی‌دهد.
 */
export default function ObservabilityLoading() {
  return (
    <div className={s.skeleton} aria-busy="true" aria-live="polite">
      <span className="sr-only">در حال خواندن آخرین وضعیت سامانه</span>
      <div className={s.skelBar} />
      <div className={s.skelDeck} />
      <div className={s.skelScore} />
      <div className={s.skelRows}>
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
        <div className={s.skelRow} />
      </div>
    </div>
  );
}
