import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/icon';
import s from './wallet.module.css';

type Tx = {
  id: string;
  name: string;
  meta: string;
  amount: string;
  tone: 'up' | 'down' | 'neutral';
  icon: IconName;
};

const txs: Tx[] = [
  { id: '1', name: 'ارسال به احمد', meta: '۲ ساعت پیش', amount: '−۵۰٬۰۰۰', tone: 'down', icon: 'arrow-up' },
  { id: '2', name: 'دریافت از مریم', meta: 'دیروز', amount: '۲۰۰٬۰۰۰+', tone: 'up', icon: 'arrow-down' },
  { id: '3', name: 'قبض برق', meta: '۳ روز پیش', amount: '−۱٬۲۵۰', tone: 'down', icon: 'file-text' },
  { id: '4', name: 'واریز از بانک', meta: 'هفته پیش', amount: '۵۰۰٬۰۰۰+', tone: 'up', icon: 'plus' },
];

const tint: Record<Tx['tone'], string> = {
  up: s.tintUp,
  down: s.tintDown,
  neutral: s.tintNeutral,
};

export default function WalletHome() {
  return (
    <div className={`container ${s.shell} stagger-children`}>
      {/* Header */}
      <header className={s.top}>
        <div>
          <div className={s.greet}>سلام، احمد</div>
          <div className={s.greetSub}>
            <span className={s.breath} />
            حساب فعال است
          </div>
        </div>
        <button className={s.iconBtn} type="button" aria-label="اعلان‌ها">
          <Icon name="bell" size={18} />
        </button>
      </header>

      {/* Balance hero */}
      <section className={s.balance}>
        <div className={s.balanceLabel}>موجودی کل</div>
        <div className={s.balanceRow}>
          <span className={s.balanceNum}>۱۲٬۵۰۰</span>
          <span className={s.afn}>؁ افغانی</span>
        </div>
        <svg
          className={s.spark}
          viewBox="0 0 240 38"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 30 L30 26 L60 28 L90 18 L120 22 L150 12 L180 16 L210 8 L240 11" />
        </svg>
      </section>

      {/* Quick actions */}
      <div className={s.actions}>
        <button className={s.action} type="button">
          <Icon name="arrow-up" size={18} />
          انتقال
        </button>
        <button className={s.action} type="button">
          <Icon name="arrow-down" size={18} />
          دریافت
        </button>
        <button className={s.action} type="button">
          <Icon name="file-text" size={18} />
          قبض
        </button>
      </div>

      {/* Recent */}
      <h2 className={s.sectionTitle}>آخرین تراکنش‌ها</h2>
      <div className={s.list}>
        {txs.map((t) => (
          <div className={s.row} key={t.id}>
            <span className={`${s.tIcon} ${tint[t.tone]}`}>
              <Icon name={t.icon} size={16} />
            </span>
            <div>
              <div className={s.tName}>{t.name}</div>
              <div className={s.tMeta}>{t.meta}</div>
            </div>
            <span className={`${s.amount} ${t.tone === 'up' ? s.up : t.tone === 'down' ? s.down : ''}`}>
              {t.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
