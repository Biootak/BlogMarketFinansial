import Heading from '@/components/Heading/Heading';
import { Rocket } from 'lucide-react';

export interface Statistic {
  id: string;
  heading: string;
  subHeading: string;
}

// Formatted once at module load (server-side) — not on every render
const currentDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date());

const FOUNDER_DEMO: Statistic[] = [
  {
    id: '1',
    heading: '50',
    subHeading: `مقاله  منتشر شده است (تا ${currentDate})`,
  },
  {
    id: '2',
    heading: '۱۰۰۰',
    subHeading: `حساب کاربری ثبت شده (تا ${currentDate})`,
  },
  {
    id: '3',
    heading: '۲',
    subHeading: `کشور و منطقه حضور ما را دارند (تا ${currentDate})`,
  },
];

const SectionStatistic = () => {
  return (
    <div className={'nc-SectionStatistic relative rtl'}>
      <Heading desc="ما بی‌طرف و مستقل هستیم و هر روز تلاش می‌کنیم تا برنامه‌ها و محتوای متمایز و در سطح جهانی ایجاد کنیم.">
        <span className="inline-flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary-500" strokeWidth={2} aria-hidden />
          حقایق سریع
        </span>
      </Heading>
      <div className="grid md:grid-cols-2 gap-5 lg:grid-cols-3 xl:gap-8">
        {FOUNDER_DEMO.map((item) => (
          <div
            key={item.id}
            className="p-6 bg-white dark:bg-black/20 rounded-2xl dark:border-neutral-800"
          >
            <h3 className="text-2xl font-semibold leading-none text-neutral-900 md:text-3xl dark:text-neutral-200">
              {item.heading}
            </h3>
            <span className="block text-sm text-neutral-500 mt-3 sm:text-base dark:text-neutral-400">
              {item.subHeading}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionStatistic;
