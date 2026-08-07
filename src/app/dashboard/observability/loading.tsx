import o from './_components/obs.module.css';
import s from './observability.module.css';

/**
 * اسکلت بارگذاری — هم‌ریتم با چیدمان واقعی، نه اسپینر.
 * ترتیب دقیقاً همان چیزی است که بعد از لود می‌آید: نوار فرمان، سرصفحهٔ
 * سالنامه، بعد مدخل‌ها؛ پس هیچ پرش چیدمانی رخ نمی‌دهد.
 */
export default function ObservabilityLoading() {
  return (
    <div className={s.skeleton} aria-busy="true" aria-live="polite">
      <span className="sr-only">در حال خواندن آخرین وضعیت سامانه</span>
      <div className={o.skelBar} />
      <div className={o.skelHero} />
      <div className={o.skelRows}>
        <div className={o.skelRow} />
        <div className={o.skelRow} />
        <div className={o.skelRow} />
        <div className={o.skelRow} />
        <div className={o.skelRow} />
        <div className={o.skelRow} />
      </div>
    </div>
  );
}
