import { Loader2 } from 'lucide-react';
import s from './loading.module.css';

export default function Loading() {
  return (
    <div className={s.root} dir="rtl">
      <div className={s.hero} aria-hidden>
        <span className={s.skeleton} style={{ inlineSize: '60%', blockSize: '2.5rem' }} />
        <span className={s.skeleton} style={{ inlineSize: '40%', blockSize: '0.75rem' }} />
      </div>
      <div className={s.grid}>
        <div className={s.card} aria-hidden>
          <span className={s.skeleton} style={{ inlineSize: '100%', blockSize: '0.75rem' }} />
          <span className={s.skeleton} style={{ inlineSize: '100%', blockSize: '0.75rem' }} />
          <span className={s.skeleton} style={{ inlineSize: '100%', blockSize: '0.75rem' }} />
        </div>
        <div className={s.card} aria-hidden>
          <span className={s.skeleton} style={{ inlineSize: '100%', blockSize: '0.75rem' }} />
          <span className={s.skeleton} style={{ inlineSize: '100%', blockSize: '0.75rem' }} />
        </div>
      </div>
      <div className={s.spinWrap} role="status" aria-live="polite">
        <Loader2 size={16} className={s.spin} aria-hidden />
        <span>در حال بارگذاری جزئیات تراکنش…</span>
      </div>
    </div>
  );
}
