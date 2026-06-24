import type { FC } from 'react';
import { Mail, Sparkles, Bell, Gift, Users, CheckCircle2 } from 'lucide-react';
import SubscribeForm from './SubscribeForm';
import { subscribeToNewsletter } from '@/actions/newsletter';

export interface SectionSubscribe2Props {
  className?: string;
}

const SectionSubscribe2: FC<SectionSubscribe2Props> = async ({ className = '' }) => {
  return (
    <section
      className={`nc-SectionSubscribe2 relative ${className}`}
      dir="rtl"
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 dark:from-primary-800 dark:via-primary-900 dark:to-neutral-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating Decorations — کوچک‌تر و یکی کمتر */}
        <div className="absolute top-3 sm:top-6 start-3 sm:start-6 w-10 sm:w-16 h-10 sm:h-16 bg-white/10 rounded-full blur-xl sm:blur-2xl" />
        <div className="absolute bottom-3 sm:bottom-6 end-3 sm:end-6 w-14 sm:w-20 h-14 sm:h-20 bg-white/10 rounded-full blur-2xl" />

        {/* Content — تک‌ستونه چگال، فرم + 3 آمار فشرده در پایین */}
        <div className="relative flex flex-col items-center text-center p-5 sm:p-7 lg:p-9 gap-4 max-w-3xl mx-auto">
          {/* Badge — فشرده‌تر */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
            <span className="text-[10.5px] sm:text-xs font-medium text-white/90">خبرنامه هفتگی</span>
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
          </div>

          {/* Title — یک‌خطی، جمع‌وجور */}
          <h2 className="text-xl sm:text-2xl lg:text-2xl font-black text-white leading-tight">
            به <span className="text-amber-300">خبرنامه ما</span> بپیوندید
          </h2>

          {/* Description — یک‌خطی */}
          <p className="text-white/80 text-[13px] sm:text-sm leading-relaxed max-w-xl">
            آخرین اخبار بازارهای مالی و تحلیل‌های تخصصی، مستقیماً در ایمیل شما.
          </p>

          {/* Subscribe Form */}
          <div className="w-full max-w-md pt-1">
            <SubscribeForm onSubmit={subscribeToNewsletter} />
          </div>

          {/* Stats strip — 3 آمار افقی به جای تصویر دکوراتیو 320px */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl pt-3 sm:pt-4 border-t border-white/10">
            <StatCell icon={<Users className="h-3.5 w-3.5" strokeWidth={2.25} />} value="۱۰,۲۴۷" label="عضو فعال" />
            <StatCell icon={<Bell className="h-3.5 w-3.5" strokeWidth={2.25} />} value="هفتگی" label="ارسال منظم" />
            <StatCell icon={<CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.25} />} value="۱۰۰٪" label="بدون اسپم" />
          </div>

          {/* Trust Text */}
          <p className="text-white/50 text-[10px] sm:text-[11px]">
            هر زمان که بخواهید می‌توانید اشتراک را لغو کنید
          </p>
        </div>
      </div>
    </section>
  );
};

function StatCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 sm:gap-1 py-1">
      <div className="flex items-center gap-1 text-amber-300">
        {icon}
      </div>
      <span
        className="text-sm sm:text-base font-bold text-white tabular-nums"
        dir="ltr"
        style={{ unicodeBidi: 'isolate' }}
      >
        {value}
      </span>
      <span className="text-[10px] sm:text-[11px] text-white/60">{label}</span>
    </div>
  );
}

export default SectionSubscribe2;
